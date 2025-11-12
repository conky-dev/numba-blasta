import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-utils';
import { query } from '@/lib/db';
import { sendSMS, validatePhoneNumber, calculateSMSSegments, calculateSMSCost } from '@/lib/twilio-utils';
import { renderTemplate } from '@/lib/template-utils';

export async function POST(request: NextRequest) {
  try {
    // Authenticate and get user/org info
    const { userId, orgId } = await authenticateRequest(request);

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
      'SELECT id, opted_out FROM contacts WHERE phone_number = $1 AND org_id = $2',
      [to, orgId]
    );

    let contactId = null;
    if (contactResult.rows.length > 0) {
      const contact = contactResult.rows[0];
      contactId = contact.id;

      if (contact.opted_out) {
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

    // Send SMS via Twilio
    console.log('[SMS] Sending message:', {
      to,
      segments,
      costCents,
      hasTemplate: !!templateId
    });

    let twilioResult;
    try {
      twilioResult = await sendSMS({
        to,
        body: messageBody,
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/twilio-status`
      }, orgId);
    } catch (twilioError: any) {
      console.error('[SMS] Twilio error:', twilioError);
      
      // Insert failed message record
      await query(
        `INSERT INTO sms_messages (
          org_id, contact_id, to_number, body, direction, status,
          segments, price_cents, error_code, error_message,
          template_id, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          orgId,
          contactId,
          to,
          messageBody,
          'outbound',
          'failed',
          segments,
          costCents,
          twilioError.errorCode?.toString() || null,
          twilioError.errorMessage || 'Failed to send',
          resolvedTemplateId,
          userId
        ]
      );

      return NextResponse.json(
        { 
          error: 'Failed to send SMS',
          details: twilioError.errorMessage || 'Unknown error'
        },
        { status: 500 }
      );
    }

    // Deduct balance and insert message record in a transaction
    const client = await query('BEGIN');
    
    try {
      // Deduct balance using the SQL function
      await query(
        `SELECT deduct_credits(
          p_org_id := $1,
          p_amount := $2,
          p_type := 'sms_send',
          p_description := 'SMS sent to ' || $3,
          p_sms_count := $4,
          p_cost_per_sms := $5,
          p_created_by := $6
        )`,
        [orgId, requiredBalance, to, segments, costCents / 100, userId]
      );

      // Insert message record
      const messageResult = await query(
        `INSERT INTO sms_messages (
          org_id, contact_id, to_number, from_number, body, direction, status,
          segments, price_cents, provider_sid, provider_status,
          template_id, metadata, sent_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), $14)
        RETURNING id, created_at`,
        [
          orgId,
          contactId,
          twilioResult.to,
          twilioResult.from,
          messageBody,
          'outbound',
          twilioResult.status,
          segments,
          costCents,
          twilioResult.sid,
          twilioResult.status,
          resolvedTemplateId,
          JSON.stringify({ variables: variables || {} }),
          userId
        ]
      );

      await query('COMMIT');

      const insertedMessage = messageResult.rows[0];

      console.log('[SMS] Message sent successfully:', {
        messageId: insertedMessage.id,
        twilioSid: twilioResult.sid,
        status: twilioResult.status,
        segments,
        costCents
      });

      return NextResponse.json({
        success: true,
        message: {
          id: insertedMessage.id,
          to: twilioResult.to,
          from: twilioResult.from,
          body: messageBody,
          status: twilioResult.status,
          segments,
          cost: requiredBalance,
          providerSid: twilioResult.sid,
          createdAt: insertedMessage.created_at
        }
      });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
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

