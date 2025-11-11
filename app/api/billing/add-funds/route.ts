import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-utils';
import { query } from '@/lib/db';

/**
 * POST /api/billing/add-funds
 * Add credits to organization balance
 * Later: Integrate with Stripe for payment processing
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = await authenticateRequest(request);
    const { userId, orgId } = authResult;
    
    const body = await request.json();
    const { amount, paymentMethod, paymentIntentId, description } = body;

    // Validation
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be greater than 0.' },
        { status: 400 }
      );
    }

    // Call PostgreSQL function to add credits
    const result = await query(
      `SELECT add_credits($1, $2, $3, $4, $5, $6, $7) as transaction_id`,
      [
        orgId,
        amount,
        'purchase', // type
        description || `Added $${amount.toFixed(2)} credits`,
        paymentMethod || 'manual',
        paymentIntentId || null,
        userId
      ]
    );

    const transactionId = result.rows[0].transaction_id;

    // Get updated balance
    const balanceResult = await query(
      `SELECT sms_balance FROM organizations WHERE id = $1`,
      [orgId]
    );

    const newBalance = parseFloat(balanceResult.rows[0].sms_balance || '0');

    return NextResponse.json({
      message: 'Credits added successfully',
      transactionId,
      balance: newBalance,
      formatted: `$${newBalance.toFixed(2)}`
    }, { status: 201 });
  } catch (error: any) {
    console.error('Add funds error:', error);
    
    if (error.message?.includes('token') || 
        error.message?.includes('authentication') ||
        error.message?.includes('organization')) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: error.message 
      }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

