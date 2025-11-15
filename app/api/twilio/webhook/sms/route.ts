import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { query } from '@/app/api/_lib/db';

/**
 * POST /api/twilio/webhook/sms
 * Twilio webhook for incoming SMS messages
 * https://www.twilio.com/docs/messaging/guides/webhook-request
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // -----------------------------------------------------------------------
    // Twilio webhook signature verification
    // -----------------------------------------------------------------------
    const signature = request.headers.get('x-twilio-signature');
    const webhookToken = process.env.TWILIO_AUTH_TOKEN;

    if (!webhookToken) {
      console.error(
        '[Twilio Webhook] ❌ No TWILIO_WEBHOOK_AUTH_TOKEN or TWILIO_AUTH_TOKEN configured – cannot verify webhook signature.'
      );
      return new NextResponse('Server misconfigured', { status: 500 });
    }

    if (!signature) {
      console.error('[Twilio Webhook] ❌ Missing X-Twilio-Signature header');
      return new NextResponse('Invalid signature', { status: 403 });
    }

    // Build params object from formData
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      if (typeof value === 'string') {
        params[key] = value;
      }
    });

    const url = new URL(request.url);
    // Use the same URL you configured in Twilio console (usually without query)
    const fullUrl = `${url.origin}${url.pathname}`;

    const isValid = twilio.validateRequest(
      webhookToken,
      signature,
      fullUrl,
      params
    );

    if (!isValid) {
      console.error('[Twilio Webhook] ❌ Signature validation failed', {
        fullUrl,
        params,
      });
      // Return 403 so we can notice misconfig; Twilio will retry until fixed.
      return new NextResponse('Invalid signature', { status: 403 });
    }

    // -----------------------------------------------------------------------
    // Extract Twilio webhook parameters (now trusted)
    // -----------------------------------------------------------------------
    const messageSid = formData.get('MessageSid') as string;
    const from = formData.get('From') as string; // Contact's phone number (E.164 from Twilio)
    const to = formData.get('To') as string; // Your Twilio number
    const body = formData.get('Body') as string;
    const numSegments = parseInt(
      ((formData.get('NumSegments') as string) || '1') as string,
      10
    );
    
    console.log('📨 Twilio webhook received:', { messageSid, from, to, body });

    if (!from || !to || !body) {
      console.error('Missing required webhook parameters');
      return new NextResponse('Missing parameters', { status: 400 });
    }

    // -----------------------------------------------------------------------
    // Normalize phone and find the contact
    // We compare on the last 10 digits so formats like:
    //   "+1 (480) 510-9369" and "480-510-9369" both match.
    // -----------------------------------------------------------------------
    const normalizeToLast10 = (phone: string) => {
      const digits = phone.replace(/\D/g, '');
      return digits.slice(-10);
    };

    const normalizedFrom10 = normalizeToLast10(from);

    // Find the contact by normalized 10-digit phone number
    const contactResult = await query(
      `SELECT id, org_id, first_name, last_name 
       FROM contacts 
       WHERE RIGHT(regexp_replace(phone, '\\D', '', 'g'), 10) = $1 
       AND deleted_at IS NULL
       LIMIT 1`,
      [normalizedFrom10]
    );

    let contactId = null;
    let orgId = null;

    if (contactResult.rows.length > 0) {
      contactId = contactResult.rows[0].id;
      orgId = contactResult.rows[0].org_id;
    } else {
      // Contact not found - just log and return empty success
      console.warn(`⚠️  Inbound message from unknown number: ${from}`);
      return new NextResponse(null, { status: 204 });
    }

    // If the message body is a STOP request, mark contact as opted out
    const normalizedBody = body.trim().toLowerCase();
    const isStop =
      normalizedBody === 'stop' ||
      normalizedBody === 'stop.' ||
      normalizedBody === 'stop!' ||
      normalizedBody === 'stop\n';

    if (isStop && contactId) {
      console.log('🚫 STOP received, marking contact as opted out:', { contactId, from });
      await query(
        `UPDATE contacts
         SET opted_out_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [contactId]
      );

      // Refresh materialized view so category counts (Quick SMS) reflect opt-out
      try {
        await query('REFRESH MATERIALIZED VIEW CONCURRENTLY contact_category_counts');
      } catch (refreshError: any) {
        console.warn(
          '[Twilio Webhook] Failed to refresh contact_category_counts after STOP:',
          refreshError?.message || refreshError
        );
      }
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

    // Respond to Twilio with no auto-reply SMS (no TwiML Message)
    // 204 No Content is enough to tell Twilio the webhook was handled.
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    // Log as ERROR with full details - Vercel will flag this in monitoring
    console.error('[Twilio Webhook] ❌ CRITICAL ERROR:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      twilioData: {
        messageSid,
        from,
        to,
        bodyPreview: body?.substring(0, 50)
      }
    });
    
    // Also log a structured error for Vercel's error tracking
    console.error(JSON.stringify({
      level: 'error',
      event: 'twilio_webhook_failure',
      error: error.message,
      messageSid,
      from,
      timestamp: new Date().toISOString()
    }));
    
    // Send SMS alert to admin about webhook failure
    try {
      const alertNumber = '+14805109369';
      const errorMessage = `🚨 Webhook Error\n\nFrom: ${from || 'unknown'}\nError: ${error.message}\nTime: ${new Date().toLocaleString()}`;
      
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_MESSAGING_SERVICE_SID) {
        const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await twilioClient.messages.create({
          body: errorMessage.substring(0, 1600), // Twilio max is 1600 chars
          to: alertNumber,
          messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
        });
        console.log('[Twilio Webhook] 📱 Error alert SMS sent to admin');
      }
    } catch (alertError: any) {
      // Don't let alert failures break the webhook response
      console.error('[Twilio Webhook] Failed to send error alert SMS:', alertError.message);
    }
    
    // Still return an empty 200 to Twilio to prevent retries, but no auto-reply
    return new NextResponse(null, { status: 200 });
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

