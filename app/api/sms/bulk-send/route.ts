import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/app/api/_lib/auth-utils';
import { query } from '@/app/api/_lib/db';
import { calculateSMSSegments, calculateSMSCost } from '@/app/api/_lib/twilio-utils';
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
    const { message, templateId, variables, categories } = body; // Changed category to categories (array)

    // Resolve message body
    let messageBody = message;
    let resolvedTemplateId = templateId;

    if (templateId) {
      // Fetch template
      const templateResult = await query(
        'SELECT id, name, content FROM sms_templates WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL',
        [templateId, orgId]
      );

      if (templateResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }

      const template = templateResult.rows[0];
      
      // Render template with variables (we'll personalize per-contact later if needed)
      try {
        messageBody = renderTemplate(template.content, variables || {});
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

    // Append standard STOP verbiage to comply with SMS opt-out rules
    const OPT_OUT_TEXT = ' Reply STOP to unsubscribe.';
    if (!/stop to unsubscribe/i.test(messageBody)) {
      messageBody = `${messageBody.trim()}${OPT_OUT_TEXT}`;
    }

    // Get all contacts in the org that haven't opted out (limit to 10k at a time)
    const BATCH_SIZE = 10000;
    
    // Build WHERE clause with optional category filter
    let whereClause = `WHERE org_id = $1 
         AND opted_out_at IS NULL 
         AND deleted_at IS NULL`;
    
    const queryParams: any[] = [orgId];
    let paramIndex = 2;
    
    // Handle multiple categories or 'all'
    if (categories && Array.isArray(categories) && categories.length > 0 && !categories.includes('all')) {
      // Use GIN index with array overlap operator (&&)
      // This finds contacts where their category array overlaps with selected categories
      whereClause += ` AND category && $${paramIndex}`;
      queryParams.push(categories);
      paramIndex++;
    }
    
    const contactsResult = await query(
      `SELECT id, first_name, last_name, phone, category
       FROM contacts 
       ${whereClause}
       ORDER BY created_at ASC
       LIMIT $${paramIndex}`,
      [...queryParams, BATCH_SIZE]
    );

    const contacts = contactsResult.rows;

    if (contacts.length === 0) {
      return NextResponse.json(
        { error: categories && categories.length > 0 && !categories.includes('all')
          ? `No contacts found in selected categories` 
          : 'No contacts found to send to' 
        },
        { status: 422 }
      );
    }

    // Check if there are more contacts than the batch size
    const totalContactsResult = await query(
      `SELECT COUNT(*) as total
       FROM contacts 
       ${whereClause}`,
      queryParams.slice(0, paramIndex - 1)
    );

    const totalContacts = parseInt(totalContactsResult.rows[0]?.total || '0');
    const hasMore = totalContacts > BATCH_SIZE;

    if (hasMore) {
      console.log(`[BULK SMS] Processing ${BATCH_SIZE} of ${totalContacts} contacts (batched)`);
    }

    // Calculate estimated cost (for display only - actual deduction happens in worker)
    const segments = calculateSMSSegments(messageBody);
    const costPerMessage = calculateSMSCost(segments) / 100; // Convert cents to dollars
    const estimatedTotalCost = costPerMessage * contacts.length;

    console.log(`[BULK SMS] Estimated cost: $${estimatedTotalCost} for ${contacts.length} contacts`);

    // Queue all messages (worker will handle balance checks per message)
    console.log(`[BULK SMS] Queuing ${contacts.length} messages for org ${orgId}`);
    
    // Queue jobs in the background - don't wait for all to finish
    const jobPromises = contacts.map(async (contact) => {
      // Personalize message for each contact if using template variables
      let personalizedMessage = messageBody;
      if (templateId && (variables || contact.first_name || contact.last_name)) {
        try {
          personalizedMessage = renderTemplate(messageBody, {
            ...variables,
            firstName: contact.first_name || '',
            lastName: contact.last_name || '',
            fullName: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
          });
        } catch (error) {
          // If personalization fails, use the base message
          console.warn(`[BULK SMS] Failed to personalize for contact ${contact.id}:`, error);
        }
      }

      return queueSMS({
        to: contact.phone,
        message: personalizedMessage,
        orgId,
        userId,
        contactId: contact.id,
        templateId: resolvedTemplateId,
        variables: variables || {},
      });
    });

    // Wait for all jobs to be queued (use Promise.allSettled to not fail on single error)
    const results = await Promise.allSettled(jobPromises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failCount = results.filter(r => r.status === 'rejected').length;

    if (failCount > 0) {
      console.warn(`[BULK SMS] ${failCount} jobs failed to queue`);
    }

    console.log(`[BULK SMS] Successfully queued ${successCount} messages`);

    return NextResponse.json({
      success: true,
      bulk: {
        contactCount: contacts.length,
        totalContacts,
        hasMore,
        batchSize: BATCH_SIZE,
        jobsQueued: successCount,
        jobsFailed: failCount,
        estimatedTotalCost,
        costPerMessage,
        segments,
        queuedAt: new Date().toISOString(),
        ...(hasMore && {
          message: `Queued first ${BATCH_SIZE} contacts. Run again to send to remaining ${totalContacts - BATCH_SIZE} contacts.`
        })
      }
    });
  } catch (error: any) {
    console.error('[BULK SMS] Error:', error);

    // Check for specific error types
    if (error.message?.includes('Unauthorized') || error.message?.includes('Invalid token')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (error.message?.includes('Insufficient balance')) {
      return NextResponse.json(
        { error: 'Insufficient balance to send bulk SMS' },
        { status: 402 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to send bulk SMS' },
      { status: 500 }
    );
  }
}

