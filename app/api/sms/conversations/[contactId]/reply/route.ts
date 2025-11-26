import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/app/api/_lib/auth-utils';
import { query } from '@/app/api/_lib/db';
import { queueSMS } from '@/app/api/_lib/sms-queue';

/**
 * POST /api/sms/conversations/:contactId/reply
 * Send a reply in a conversation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const authResult = await authenticateRequest(request);
    const { userId, orgId } = authResult;
    const { contactId } = await params;
    const body = await request.json();
    const { message } = body;
    
    // Ensure orgId is present
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 }
      );
    }

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message body cannot be empty' },
        { status: 400 }
      );
    }

    // Check if organization has a phone number and if it's verified
    const phoneResult = await query(
      `SELECT id, status FROM phone_numbers 
       WHERE org_id = $1 AND is_primary = true`,
      [orgId]
    );

    if (phoneResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No phone number configured for this organization' },
        { status: 422 }
      );
    }

    const phoneStatus = phoneResult.rows[0].status;
    if (phoneStatus === 'awaiting_verification') {
      return NextResponse.json(
        { error: 'Cannot send messages while phone number is awaiting verification. Please complete the verification process first.' },
        { status: 422 }
      );
    }

    // Get contact info
    const contactResult = await query(
      `SELECT id, phone, first_name, last_name 
       FROM contacts 
       WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
      [contactId, orgId]
    );

    if (contactResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    const contact = contactResult.rows[0];

    // Queue the SMS
    const queueStartTime = Date.now();
    console.log(`[${new Date().toISOString()}] [REPLY] Queuing reply to ${contact.phone}:`, {
      contactId,
      messageLength: message.trim().length,
      messagePreview: message.trim().substring(0, 50)
    });

    const job = await queueSMS({
      to: contact.phone,
      message: message.trim(),
      orgId,
      userId,
      contactId,
      isMessengerReply: true, // Flag this as a messenger reply (no opt-out needed)
    });

    const queueTime = Date.now() - queueStartTime;
    console.log(`[${new Date().toISOString()}] [REPLY] Reply queued successfully (${queueTime}ms):`, {
      jobId: job.id,
      contactId,
      contactPhone: contact.phone
    });

    return NextResponse.json({
      success: true,
      message: 'Reply queued successfully',
      jobId: job.id,
      contact: {
        id: contact.id,
        name: contact.first_name && contact.last_name
          ? `${contact.first_name} ${contact.last_name}`.trim()
          : contact.first_name || contact.last_name || 'Unknown',
        phone: contact.phone,
      },
    });
  } catch (error: any) {
    console.error('Send reply error:', error);
    
    if (error.message?.includes('token') || 
        error.message?.includes('authentication') ||
        error.message?.includes('organization')) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: error.message 
      }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to send reply' },
      { status: 500 }
    );
  }
}

