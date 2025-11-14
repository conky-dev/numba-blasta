import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/app/api/_lib/auth-utils';
import { query } from '@/app/api/_lib/db';
import { validatePhoneNumber, calculateSMSSegments, calculateSMSCost } from '@/app/api/_lib/twilio-utils';
import { renderTemplate } from '@/app/api/_lib/template-utils';
import { queueSMS } from '@/app/api/_lib/sms-queue';

export async function POST(request: NextRequest) {
  try {
    // Authenticate and get user/org info
    const authResult = await authenticateRequest(request);
    const { userId, orgId } = authResult;
    
    // Ensure orgId is present
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { to, message, templateId, variables, scheduledAt } = body;

    // Validate required fields
    if (!to) {
      return NextResponse.json(
        { error: 'Recipient phone number (to) is required' },
        { status: 422 }
      );
    }

    // Validate phone number format
    const phoneValidation = validatePhoneNumber(to);
    if (!phoneValidation.valid) {
      return NextResponse.json(
        { error: phoneValidation.error },
        { status: 422 }
      );
    }

    // Resolve message body
    let messageBody = message;
    let resolvedTemplateId = templateId;

    if (templateId) {
      // Fetch template
      const templateResult = await query(
        'SELECT id, name, body FROM sms_templates WHERE id = $1 AND org_id = $2',
        [templateId, orgId]
      );

      if (templateResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }

      const template = templateResult.rows[0];
      
      // Render template with variables
      try {
        messageBody = renderTemplate(template.body, variables || {});
      } catch (error: any) {
        return NextResponse.json(
          { error: `Template rendering error: ${error.message}` },
          { status: 422 }
        );
      }
    }

    if (!messageBody || messageBody.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message body cannot be empty' },
        { status: 422 }
      );
    }

    // Check if contact exists and if they've opted out
    const contactResult = await query(
      'SELECT id, opted_out_at FROM contacts WHERE phone = $1 AND org_id = $2 AND deleted_at IS NULL',
      [to, orgId]
    );

    let contactId = null;
    if (contactResult.rows.length > 0) {
      const contact = contactResult.rows[0];
      contactId = contact.id;

      if (contact.opted_out_at) {
        return NextResponse.json(
          { error: 'Contact has opted out of SMS communications' },
          { status: 422 }
        );
      }
    }

    // Calculate segments and cost
    const segments = calculateSMSSegments(messageBody);
    const costCents = calculateSMSCost(segments);

    // Check balance
    const balanceResult = await query(
      'SELECT sms_balance FROM organizations WHERE id = $1',
      [orgId]
    );

    if (balanceResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const currentBalance = parseFloat(balanceResult.rows[0].sms_balance);
    const requiredBalance = costCents / 100; // Convert cents to dollars

    if (currentBalance < requiredBalance) {
      return NextResponse.json(
        { 
          error: 'Insufficient balance',
          balance: currentBalance,
          required: requiredBalance
        },
        { status: 402 }
      );
    }

    // Handle scheduling (for future implementation)
    if (scheduledAt && new Date(scheduledAt) > new Date()) {
      // TODO: Implement scheduling with a job queue
      return NextResponse.json(
        { error: 'Scheduled messages not yet supported. Coming soon!' },
        { status: 422 }
      );
    }

    // Queue the SMS job (don't send directly)
    const queueStartTime = Date.now();
    console.log(`[${new Date().toISOString()}] [SMS] Queuing message:`, {
      to,
      segments,
      costCents,
      hasTemplate: !!templateId
    });

    const job = await queueSMS({
      to,
      message: messageBody,
      orgId,
      userId,
      contactId,
      templateId: resolvedTemplateId,
      variables: variables || {},
    });

    const queueTime = Date.now() - queueStartTime;
    console.log(`[${new Date().toISOString()}] [SMS] Message queued successfully (${queueTime}ms):`, {
      jobId: job.id,
      to,
      segments,
      costCents
    });

    return NextResponse.json({
      success: true,
      message: {
        id: job.id,
        to,
        body: messageBody,
        status: 'queued',
        segments,
        estimatedCost: costCents / 100,
        queuedAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('[SMS] Error:', error);

    // Check for specific error types
    if (error.message?.includes('Unauthorized') || error.message?.includes('Invalid token')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (error.message?.includes('Insufficient balance')) {
      return NextResponse.json(
        { error: 'Insufficient balance to send SMS' },
        { status: 402 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to send SMS' },
      { status: 500 }
    );
  }
}

