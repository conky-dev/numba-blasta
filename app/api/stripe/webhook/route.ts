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
 * Next.js App Router automatically provides the raw body when using request.text()
 */
export async function POST(request: NextRequest) {
  // Get raw body as text (required for Stripe signature verification)
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature || !webhookSecret) {
    console.error('[STRIPE WEBHOOK] Missing signature or webhook secret');
    return NextResponse.json(
      { error: 'Missing signature or webhook secret' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('[STRIPE WEBHOOK] Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Handle the event
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      // Only process if this is an add_funds payment
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

