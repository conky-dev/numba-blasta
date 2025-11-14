import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/api/_lib/db';

/**
 * POST /api/twilio/webhook/sms
 * Twilio webhook for incoming SMS messages
 * https://www.twilio.com/docs/messaging/guides/webhook-request
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract Twilio webhook parameters
    const messageSid = formData.get('MessageSid') as string;
    const from = formData.get('From') as string; // Contact's phone number
    const to = formData.get('To') as string; // Your Twilio number
    const body = formData.get('Body') as string;
    const numSegments = parseInt(formData.get('NumSegments') as string || '1');
    
    console.log('📨 Twilio webhook received:', { messageSid, from, to, body });

    if (!from || !to || !body) {
      console.error('Missing required webhook parameters');
      return new NextResponse('Missing parameters', { status: 400 });
    }

    // Find the contact by phone number
    const contactResult = await query(
      `SELECT id, org_id, first_name, last_name 
       FROM contacts 
       WHERE phone = $1 
       AND deleted_at IS NULL
       LIMIT 1`,
      [from]
    );

    let contactId = null;
    let orgId = null;

    if (contactResult.rows.length > 0) {
      contactId = contactResult.rows[0].id;
      orgId = contactResult.rows[0].org_id;
    } else {
      // Contact not found - you could auto-create or just log it
      console.warn(`⚠️  Inbound message from unknown number: ${from}`);
      
      // For now, just store it without a contact/org association
      // In production, you'd want to handle this better
      return new NextResponse('Contact not found', { status: 200 }); // Still return 200 to Twilio
    }

    // Insert the inbound message into the database
    await query(
      `INSERT INTO sms_messages (
        org_id,
        contact_id,
        from_number,
        to_number,
        body,
        direction,
        status,
        segments,
        price_cents,
        created_at,
        sent_at,
        delivered_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), NOW())`,
      [
        orgId,
        contactId,
        from,
        to,
        body,
        'inbound',
        'received',
        numSegments,
        0, // Inbound messages are free
      ]
    );

    console.log('✅ Inbound message saved to database');

    // Respond to Twilio (must be 200 OK or Twilio will retry)
    return new NextResponse('Message received', { status: 200 });
  } catch (error: any) {
    console.error('❌ Twilio webhook error:', error);
    
    // Still return 200 to Twilio to prevent retries
    return new NextResponse('Error processing message', { status: 200 });
  }
}

/**
 * GET /api/twilio/webhook/sms
 * Health check for the webhook endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Twilio SMS webhook endpoint is running',
    url: '/api/twilio/webhook/sms',
  });
}

