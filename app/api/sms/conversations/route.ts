import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-utils';
import { query } from '@/lib/db';

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

    const validLimit = Math.min(Math.max(limit, 1), 100);
    const validOffset = Math.max(offset, 0);

    // Build WHERE clause
    let whereClause = 'WHERE c.org_id = $1 AND c.deleted_at IS NULL';
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

    // Get total count of contacts with messages
    const countResult = await query(
      `SELECT COUNT(DISTINCT c.id) as total
       FROM contacts c
       ${whereClause}
       AND EXISTS (
         SELECT 1 FROM sms_messages m
         WHERE m.contact_id = c.id
       )`,
      queryParams
    );

    const totalConversations = parseInt(countResult.rows[0]?.total || '0');

    // Get conversations with last message info
    const result = await query(
      `SELECT 
        c.id as contact_id,
        c.first_name,
        c.last_name,
        c.phone,
        (SELECT body FROM sms_messages 
         WHERE contact_id = c.id 
         ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM sms_messages 
         WHERE contact_id = c.id 
         ORDER BY created_at DESC LIMIT 1) as last_message_at,
        (SELECT direction FROM sms_messages 
         WHERE contact_id = c.id 
         ORDER BY created_at DESC LIMIT 1) as last_message_direction,
        (SELECT COUNT(*) FROM sms_messages 
         WHERE contact_id = c.id 
         AND direction = 'inbound') as total_inbound,
        (SELECT COUNT(*) FROM sms_messages 
         WHERE contact_id = c.id 
         AND direction = 'outbound') as total_outbound
       FROM contacts c
       ${whereClause}
       AND EXISTS (
         SELECT 1 FROM sms_messages m
         WHERE m.contact_id = c.id
       )
       ORDER BY last_message_at DESC NULLS LAST
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, validLimit, validOffset]
    );

    return NextResponse.json({
      conversations: result.rows.map(row => ({
        contactId: row.contact_id,
        contactName: row.first_name && row.last_name 
          ? `${row.first_name} ${row.last_name}`.trim()
          : row.first_name || row.last_name || 'Unknown',
        phone: row.phone,
        lastMessage: row.last_message || '',
        lastMessageAt: row.last_message_at,
        lastMessageDirection: row.last_message_direction,
        hasInbound: parseInt(row.total_inbound) > 0,
        totalInbound: parseInt(row.total_inbound),
        totalOutbound: parseInt(row.total_outbound),
      })),
      pagination: {
        total: totalConversations,
        limit: validLimit,
        offset: validOffset,
        hasMore: validOffset + validLimit < totalConversations,
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

