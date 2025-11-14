import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, requireOwner } from '@/lib/auth-utils';
import { query } from '@/lib/db';
import twilio from 'twilio';
import { createSubaccount, isMasterAccountConfigured } from '@/lib/twilio-subaccounts';

/**
 * GET /api/organizations/sms-provider
 * Get SMS provider integration status for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const authContext = await authenticateRequest(request);
    const { orgId } = authContext;
    
    // Require owner or admin
    requireOwner(authContext);

    const result = await query(
      `SELECT 
        twilio_account_sid,
        twilio_messaging_service_sid,
        account_type,
        CASE 
          WHEN twilio_account_sid IS NOT NULL 
            AND twilio_auth_token IS NOT NULL 
          THEN true 
          ELSE false 
        END as is_connected
       FROM organizations 
       WHERE id = $1`,
      [orgId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const org = result.rows[0];

    return NextResponse.json({
      isConnected: org.is_connected,
      accountSid: org.twilio_account_sid || null,
      messagingServiceSid: org.twilio_messaging_service_sid || null,
      accountType: org.account_type || 'byoa',
      managedAccountAvailable: isMasterAccountConfigured()
    });
  } catch (error: any) {
    console.error('Get SMS provider settings error:', error);
    
    if (error.message?.includes('access') || error.message?.includes('owner')) {
      return NextResponse.json({ 
        error: 'Unauthorized - Owner access required' 
      }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations/sms-provider
 * Connect SMS provider account to organization (BYOA)
 */
export async function POST(request: NextRequest) {
  try {
    const authContext = await authenticateRequest(request);
    const { orgId, userId } = authContext;
    
    // Require owner
    requireOwner(authContext);

    const { accountSid, authToken, messagingServiceSid } = await request.json();

    // Validation
    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: 'Account SID and Auth Token are required' },
        { status: 400 }
      );
    }

    // Verify credentials
    console.log('🔐 Verifying SMS provider credentials...');
    
    try {
      const twilioClient = twilio(accountSid, authToken);
      
      // Test the credentials by fetching account info
      const account = await twilioClient.api.accounts(accountSid).fetch();
      
      console.log('✅ SMS provider credentials verified:', account.friendlyName);

      // If messaging service SID provided, verify it exists
      if (messagingServiceSid) {
        try {
          await twilioClient.messaging.v1.services(messagingServiceSid).fetch();
          console.log('✅ Messaging Service verified');
        } catch (e: any) {
          return NextResponse.json(
            { error: 'Invalid Messaging Service SID' },
            { status: 400 }
          );
        }
      }

    } catch (twilioError: any) {
      console.error('❌ SMS provider verification failed:', twilioError.message);
      return NextResponse.json(
        { error: 'Invalid SMS provider credentials' },
        { status: 400 }
      );
    }

    // Save to database as BYOA (Bring Your Own Account)
    await query(
      `UPDATE organizations
       SET twilio_account_sid = $1,
           twilio_auth_token = $2,
           twilio_messaging_service_sid = $3,
           account_type = 'byoa',
           updated_at = NOW()
       WHERE id = $4`,
      [accountSid, authToken, messagingServiceSid || null, orgId]
    );

    console.log(`✅ SMS provider connected (BYOA) for org ${orgId}`);

    return NextResponse.json({
      success: true,
      message: 'SMS provider account connected successfully',
    });
  } catch (error: any) {
    console.error('Connect SMS provider error:', error);
    
    if (error.message?.includes('access') || error.message?.includes('owner')) {
      return NextResponse.json({ 
        error: 'Unauthorized - Owner access required' 
      }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizations/sms-provider
 * Disconnect SMS provider account from organization
 */
export async function DELETE(request: NextRequest) {
  try {
    const authContext = await authenticateRequest(request);
    const { orgId } = authContext;
    
    // Require owner
    requireOwner(authContext);

    await query(
      `UPDATE organizations
       SET twilio_account_sid = NULL,
           twilio_auth_token = NULL,
           twilio_messaging_service_sid = NULL,
           account_type = 'platform',
           updated_at = NOW()
       WHERE id = $1`,
      [orgId]
    );

    console.log(`✅ SMS provider disconnected for org ${orgId}`);

    return NextResponse.json({
      success: true,
      message: 'SMS provider account disconnected',
    });
  } catch (error: any) {
    console.error('Disconnect SMS provider error:', error);
    
    if (error.message?.includes('access') || error.message?.includes('owner')) {
      return NextResponse.json({ 
        error: 'Unauthorized - Owner access required' 
      }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

