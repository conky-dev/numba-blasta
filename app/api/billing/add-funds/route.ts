import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-utils';
import { query } from '@/lib/db';
import { createSubaccount, isMasterAccountConfigured } from '@/lib/twilio-subaccounts';

/**
 * POST /api/billing/add-funds
 * Add credits to organization balance
 * Auto-creates managed SMS provider account on first funding
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

    // Check if this is the first funding AND they don't have an SMS provider yet
    const orgResult = await query(
      `SELECT 
        name, 
        account_type, 
        twilio_account_sid,
        sms_balance
       FROM organizations 
       WHERE id = $1`,
      [orgId]
    );

    const org = orgResult.rows[0];
    const isFirstFunding = parseFloat(org.sms_balance || '0') === 0;
    const hasNoProvider = !org.twilio_account_sid;

    // Auto-create managed subaccount if:
    // 1. This is their first funding
    // 2. They don't have an SMS provider connected yet
    // 3. Master Twilio account is configured
    if (isFirstFunding && hasNoProvider && isMasterAccountConfigured()) {
      console.log(`🚀 First funding for org ${orgId} - Creating managed subaccount...`);
      
      try {
        const subaccount = await createSubaccount(org.name);
        
        // Save subaccount credentials to database
        await query(
          `UPDATE organizations
           SET twilio_account_sid = $1,
               twilio_auth_token = $2,
               twilio_messaging_service_sid = $3,
               account_type = 'managed',
               updated_at = NOW()
           WHERE id = $4`,
          [
            subaccount.accountSid,
            subaccount.authToken,
            subaccount.messagingServiceSid,
            orgId
          ]
        );

        console.log(`✅ Managed subaccount created and linked for org ${orgId}`);
      } catch (subaccountError: any) {
        console.error('⚠️  Failed to create managed subaccount:', subaccountError.message);
        // Don't fail the entire funding transaction - just log the error
        // They can still use platform-level account or connect their own later
      }
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

