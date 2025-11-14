import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/app/api/_lib/auth-utils';
import { query } from '@/app/api/_lib/db';

/**
 * GET /api/sms/messages
 * List all SMS messages for the organization with pagination, filtering, and sorting
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await authenticateRequest(request);
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';
    const searchField = searchParams.get('searchField') || 'to_number';
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';
    const sortField = searchParams.get('sortField') || 'created_at';
    const sortDirection = searchParams.get('sortDirection') || 'desc';

    // Validate limit
    const validLimit = Math.min(Math.max(limit, 1), 100);
    const validOffset = Math.max(offset, 0);

    // Validate sort direction
    const validSortDirection = sortDirection === 'asc' ? 'ASC' : 'DESC';

    // Validate sort field (prevent SQL injection)
    const validSortFields = ['created_at', 'to_number', 'from_number', 'status', 'body'];
    const validSortField = validSortFields.includes(sortField) ? sortField : 'created_at';

    // Build WHERE clause
    let whereClause = 'WHERE m.org_id = $1 AND m.direction = $2';
    const queryParams: any[] = [orgId, 'outbound']; // Only show outbound messages
    let paramIndex = 3;

    // Date filters
    if (fromDate) {
      whereClause += ` AND m.created_at >= $${paramIndex}::timestamp`;
      queryParams.push(fromDate);
      paramIndex++;
    }

    if (toDate) {
      whereClause += ` AND m.created_at <= $${paramIndex}::timestamp`;
      queryParams.push(toDate);
      paramIndex++;
    }

    // Search filter
    if (search) {
      const validSearchFields = ['to_number', 'from_number', 'body'];
      const searchColumn = validSearchFields.includes(searchField) ? searchField : 'to_number';
      
      whereClause += ` AND m.${searchColumn} ILIKE $${paramIndex}`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM sms_messages m ${whereClause}`,
      queryParams.slice(0, paramIndex - 1)
    );

    const totalMessages = parseInt(countResult.rows[0]?.total || '0');

    // Get messages with pagination
    const result = await query(
      `SELECT 
        m.id,
        m.to_number,
        m.from_number,
        m.body,
        m.status,
        m.direction,
        m.segments,
        m.price_cents,
        m.created_at,
        m.sent_at,
        m.delivered_at,
        m.error_message,
        c.first_name,
        c.last_name,
        u.full_name as created_by_name
       FROM sms_messages m
       LEFT JOIN contacts c ON m.contact_id = c.id
       LEFT JOIN user_profiles u ON m.created_by = u.user_id
       ${whereClause}
       ORDER BY m.${validSortField} ${validSortDirection}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, validLimit, validOffset]
    );

    return NextResponse.json({
      messages: result.rows.map(row => ({
        id: row.id,
        to: row.to_number,
        from: row.from_number,
        body: row.body,
        status: row.status,
        direction: row.direction,
        segments: row.segments,
        priceCents: row.price_cents,
        createdAt: row.created_at,
        sentAt: row.sent_at,
        deliveredAt: row.delivered_at,
        errorMessage: row.error_message,
        contactName: row.first_name && row.last_name 
          ? `${row.first_name} ${row.last_name}`.trim()
          : row.first_name || row.last_name || null,
        createdByName: row.created_by_name,
      })),
      pagination: {
        total: totalMessages,
        limit: validLimit,
        offset: validOffset,
        hasMore: validOffset + validLimit < totalMessages,
      },
    });
  } catch (error: any) {
    console.error('Get SMS messages error:', error);
    
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

