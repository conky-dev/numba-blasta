import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/app/api/_lib/auth-utils';
import Stripe from 'stripe';
import { query } from '@/app/api/_lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const dynamic = 'force-dynamic';

/**
 * POST /api/organizations/phone-numbers/checkout
 * Creates a Stripe Checkout session for purchasing a phone number
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await authenticateRequest(request);

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 }
      );
    }

    // Get the price for buying a phone number
    const pricingResult = await query(
      `SELECT price_per_unit, currency
       FROM pricing
       WHERE service_type = 'buy_phone_number' AND is_active = true
       LIMIT 1`,
      []
    );

    if (pricingResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Pricing not configured for phone numbers' },
        { status: 500 }
      );
    }

    const price = parseFloat(pricingResult.rows[0].price_per_unit.toString());
    const currency = pricingResult.rows[0].currency || 'USD';

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: 'Phone Number Purchase',
              description: 'Purchase a toll-free phone number for SMS messaging',
            },
            unit_amount: Math.round(price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${APP_URL}/settings/phone-numbers?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/settings/phone-numbers?canceled=true`,
      metadata: {
        orgId,
        userId,
        type: 'buy_phone_number',
        amount: price.toString(),
      },
    });

    return NextResponse.json(
      {
        sessionId: session.id,
        url: session.url,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[PHONE NUMBER CHECKOUT] Create checkout session error:', error);
    
    if (error.message?.includes('token') || 
        error.message?.includes('authentication') ||
        error.message?.includes('organization')) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: error.message 
      }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

