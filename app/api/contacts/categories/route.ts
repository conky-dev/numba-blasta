import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-utils';
import { query } from '@/lib/db';

/**
 * GET /api/contacts/categories
 * Get contact categories with counts for the organization
 * Uses materialized view for fast counts with multi-category support
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = await authenticateRequest(request);
    const { orgId } = authResult;

    // Get category counts from materialized view (fast for large datasets)
    const result = await query(
      `SELECT category_name, SUM(contact_count)::int as count
       FROM contact_category_counts
       WHERE org_id = $1
       GROUP BY category_name
       HAVING SUM(contact_count) > 0
       ORDER BY count DESC`,
      [orgId]
    );

    // Get total count
    const totalResult = await query(
      `SELECT COUNT(*) as total
       FROM contacts
       WHERE org_id = $1 
         AND deleted_at IS NULL 
         AND opted_out_at IS NULL`,
      [orgId]
    );

    const total = parseInt(totalResult.rows[0]?.total || '0');

    return NextResponse.json({
      categories: result.rows.map(row => ({
        name: row.category_name,
        count: parseInt(row.count)
      })),
      total
    });
  } catch (error: any) {
    console.error('Get categories error:', error);
    
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

