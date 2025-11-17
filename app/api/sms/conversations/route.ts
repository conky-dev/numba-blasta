import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/app/api/_lib/auth-utils';
import { query } from '@/app/api/_lib/db';

/**
 * GET /api/sms/conversations
 * Get list of contacts with message history (inbound or outbound)
 */
export async function GET(request: NextRequest) {
  try {
    const { orgId } = await authenticateRequest(request);
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || ''; // Filter by category

    const validLimit = Math.min(Math.max(limit, 1), 100);
    const validOffset = Math.max(offset, 0);

    // Build WHERE clause
    let whereClause = 'WHERE c.org_id = $1 AND c.deleted_at IS NULL AND c.opted_out_at IS NULL';
    const queryParams: any[] = [orgId];
    let paramIndex = 2;

    // Search filter
    if (search) {
      whereClause += ` AND (
        c.first_name ILIKE $${paramIndex} OR
        c.last_name ILIKE $${paramIndex} OR
        c.phone ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Category filter (array overlap)
    if (category) {
      whereClause += ` AND c.category && ARRAY[$${paramIndex}]::TEXT[]`;
      queryParams.push(category);
      paramIndex++;
    }

    // Get conversations ordered by most recent INBOUND message first
    const result = await query(
      `SELECT 
        c.id as contact_id,
        c.first_name,
        c.last_name,
        c.phone,
        c.category,
        (
          SELECT body 
          FROM sms_messages 
          WHERE contact_id = c.id AND org_id = $1 
          ORDER BY created_at DESC 
          LIMIT 1
        ) as last_message,
        (
          SELECT created_at 
          FROM sms_messages 
          WHERE contact_id = c.id AND org_id = $1 
          ORDER BY created_at DESC 
          LIMIT 1
        ) as last_message_at,
        (
          SELECT direction 
          FROM sms_messages 
          WHERE contact_id = c.id AND org_id = $1 
          ORDER BY created_at DESC 
          LIMIT 1
        ) as last_message_direction,
        (
          SELECT created_at 
          FROM sms_messages 
          WHERE contact_id = c.id AND org_id = $1 AND direction = 'inbound'
          ORDER BY created_at DESC 
          LIMIT 1
        ) as last_inbound_at
      FROM contacts c
      ${whereClause}
      AND EXISTS (
        SELECT 1 FROM sms_messages 
        WHERE contact_id = c.id AND org_id = $1
      )
      ORDER BY 
        last_inbound_at DESC NULLS LAST,
        last_message_at DESC NULLS LAST
      LIMIT $${paramIndex}`,
      [...queryParams, validLimit]
    );

    return NextResponse.json({
      conversations: result.rows.map(row => ({
        contactId: row.contact_id,
        contactName: row.first_name && row.last_name 
          ? `${row.first_name} ${row.last_name}`.trim()
          : row.first_name || row.last_name || 'Unknown',
        phone: row.phone,
        category: row.category || [],
        lastMessage: row.last_message || '',
        lastMessageAt: row.last_message_at,
        lastMessageDirection: row.last_message_direction,
        hasInbound: row.last_message_direction === 'inbound',
        totalInbound: 0,
        totalOutbound: 0,
      })),
      pagination: {
        total: result.rows.length, // Just return count of current page for speed
        limit: validLimit,
        offset: validOffset,
        hasMore: result.rows.length === validLimit, // If we got a full page, there might be more
      },
    });
  } catch (error: any) {
    console.error('Get conversations error:', error);
    
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

