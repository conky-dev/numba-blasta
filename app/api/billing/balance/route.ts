import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-utils';
import { query } from '@/lib/db';

/**
 * GET /api/billing/balance
 * Get current SMS balance for the organization
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = await authenticateRequest(request);
    const { orgId } = authResult;

    // Get current balance
    const result = await query(
      `SELECT sms_balance FROM organizations WHERE id = $1`,
      [orgId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const balance = parseFloat(result.rows[0].sms_balance || '0');

    return NextResponse.json({
      balance,
      formatted: `$${balance.toFixed(2)}`
    });
  } catch (error: any) {
    console.error('Get balance error:', error);
    
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

