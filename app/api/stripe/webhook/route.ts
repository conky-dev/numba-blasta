import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { query } from '@/app/api/_lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Disable body parsing for webhook signature verification
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/stripe/webhook
 * Handles Stripe webhook events (payment success, etc.)
 * 
 * Note: This endpoint must receive the raw request body for signature verification.
 * We read the body as a stream and convert to text to ensure it's not modified.
 */
export async function POST(request: NextRequest) {
  // Get raw body as text (required for Stripe signature verification)
  // Read from the request body stream to ensure we get the exact raw bytes
  let body: string;
  try {
    // Use request.text() which should give us the raw body in Next.js App Router
    body = await request.text();
  } catch (error) {
    console.error('[STRIPE WEBHOOK] Failed to read request body:', error);
    return NextResponse.json(
      { error: 'Failed to read request body' },
      { status: 400 }
    );
  }

  const signature = request.headers.get('stripe-signature');

  if (!signature || !webhookSecret) {
    console.error('[STRIPE WEBHOOK] Missing signature or webhook secret', {
      hasSignature: !!signature,
      hasWebhookSecret: !!webhookSecret,
      webhookSecretPrefix: webhookSecret?.substring(0, 10) || 'none'
    });
    return NextResponse.json(
      { error: 'Missing signature or webhook secret' },
      { status: 400 }
    );
  }

  // Log for debugging (don't log full body in production)
  console.log('[STRIPE WEBHOOK] Received webhook:', {
    bodyLength: body.length,
    signaturePrefix: signature.substring(0, 20),
    url: request.url
  });

  let event: Stripe.Event;

  try {
    // Use the raw body string and signature for verification
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log('[STRIPE WEBHOOK] Signature verified successfully, event type:', event.type);
  } catch (err: any) {
    console.error('[STRIPE WEBHOOK] Webhook signature verification failed:', {
      error: err.message,
      bodyLength: body.length,
      bodyPreview: body.substring(0, 100),
      signaturePrefix: signature.substring(0, 20),
      webhookSecretPrefix: webhookSecret.substring(0, 10),
      url: request.url
    });
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Handle the event
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      // Handle add_funds payment
      if (session.metadata?.type === 'add_funds') {
        const orgId = session.metadata.orgId;
        const userId = session.metadata.userId;
        const amount = parseFloat(session.metadata.amount || '0');
        const paymentIntentId = session.payment_intent as string;

        if (!orgId || !amount || amount <= 0) {
          console.error('[STRIPE WEBHOOK] Invalid metadata:', session.metadata);
          return NextResponse.json(
            { error: 'Invalid metadata' },
            { status: 400 }
          );
        }

        console.log('[STRIPE WEBHOOK] Processing payment:', {
          orgId,
          userId,
          amount,
          paymentIntentId,
          sessionId: session.id,
        });

        // Add credits to organization balance
        const result = await query(
          `SELECT add_credits($1, $2, $3, $4, $5, $6, $7) as transaction_id`,
          [
            orgId,
            amount,
            'purchase', // type
            `Added $${amount.toFixed(2)} credits via Stripe`,
            'stripe',
            paymentIntentId,
            userId || null,
          ]
        );

        const transactionId = result.rows[0]?.transaction_id;

        console.log('[STRIPE WEBHOOK] Successfully added credits:', {
          orgId,
          amount,
          transactionId,
        });

        return NextResponse.json({
          received: true,
          transactionId,
        });
      }

      // Handle buy_phone_number payment
      if (session.metadata?.type === 'buy_phone_number') {
        const orgId = session.metadata.orgId;
        const userId = session.metadata.userId;
        const paymentIntentId = session.payment_intent as string;

        if (!orgId) {
          console.error('[STRIPE WEBHOOK] Invalid metadata for phone number purchase:', session.metadata);
          return NextResponse.json(
            { error: 'Invalid metadata' },
            { status: 400 }
          );
        }

        console.log('[STRIPE WEBHOOK] Processing phone number purchase:', {
          orgId,
          userId,
          paymentIntentId,
          sessionId: session.id,
        });

        // Import the provisioning function
        const { provisionOrgTollFreeNumber } = await import('@/app/api/_lib/twilio-provisioning');

        // Provision the phone number
        const { phoneNumber, phoneSid } = await provisionOrgTollFreeNumber(orgId);

        // Check if this is the first number (make it primary)
        const existingCount = await query(
          `SELECT COUNT(*) as count FROM phone_numbers WHERE org_id = $1`,
          [orgId]
        );
        const isFirstNumber = existingCount.rows[0]?.count === '0';

        // Store in phone_numbers table
        await query(
          `INSERT INTO phone_numbers (org_id, phone_number, phone_sid, type, status, is_primary, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [orgId, phoneNumber, phoneSid, 'toll-free', 'awaiting_verification', isFirstNumber, userId || null]
        );

        // Also update organizations table for backward compatibility (set as primary if first)
        if (isFirstNumber) {
          await query(
            `UPDATE organizations
             SET sms_sender_number = $1,
                 sms_sender_status = 'awaiting_verification',
                 updated_at = NOW()
             WHERE id = $2`,
            [phoneNumber, orgId]
          );
        }

        console.log('[STRIPE WEBHOOK] Successfully provisioned phone number:', {
          orgId,
          phoneNumber,
          phoneSid,
          isPrimary: isFirstNumber,
        });

        return NextResponse.json({
          received: true,
          phoneNumber,
        });
      }
    }

    // Return a response to acknowledge receipt of the event
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[STRIPE WEBHOOK] Error processing webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

