import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-utils';
import { query } from '@/lib/db';

/**
 * GET /api/billing/transactions
 * Get transaction history for the organization
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = await authenticateRequest(request);
    const { orgId } = authResult;
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type'); // Optional filter by type

    // Validate limit (max 100)
    const validLimit = Math.min(Math.max(limit, 1), 100);
    const validOffset = Math.max(offset, 0);

    // Build query
    let sqlQuery = `
      SELECT 
        id,
        type,
        amount,
        balance_before,
        balance_after,
        sms_count,
        cost_per_sms,
        payment_method,
        payment_intent_id,
        campaign_id,
        description,
        metadata,
        created_at
      FROM billing_transactions
      WHERE org_id = $1
    `;
    
    const params: any[] = [orgId];
    let paramIndex = 2;

    // Filter by type if provided
    if (type) {
      sqlQuery += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    // Order and pagination
    sqlQuery += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(validLimit, validOffset);

    const result = await query(sqlQuery, params);

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*)::integer as total
       FROM billing_transactions
       WHERE org_id = $1 ${type ? 'AND type = $2' : ''}`,
      type ? [orgId, type] : [orgId]
    );

    const total = countResult.rows[0]?.total || 0;

    return NextResponse.json({
      transactions: result.rows,
      pagination: {
        total,
        limit: validLimit,
        offset: validOffset,
        hasMore: validOffset + validLimit < total
      }
    });
  } catch (error: any) {
    console.error('Get transactions error:', error);
    
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

