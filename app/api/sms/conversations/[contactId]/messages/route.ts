import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/app/api/_lib/auth-utils';
import { query } from '@/app/api/_lib/db';

/**
 * GET /api/sms/conversations/:contactId/messages
 * Get all messages for a specific contact conversation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const { orgId } = await authenticateRequest(request);
    const { contactId } = await params;
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const validLimit = Math.min(Math.max(limit, 1), 100);
    const validOffset = Math.max(offset, 0);

    // Verify contact belongs to org
    const contactCheck = await query(
      `SELECT id FROM contacts WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
      [contactId, orgId]
    );

    if (contactCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    // Get total message count
    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM sms_messages
       WHERE contact_id = $1`,
      [contactId]
    );

    const totalMessages = parseInt(countResult.rows[0]?.total || '0');

    // Get messages (most recent first for pagination)
    const result = await query(
      `SELECT 
        id,
        direction,
        body,
        status,
        to_number,
        from_number,
        created_at,
        sent_at,
        delivered_at,
        error_message,
        segments,
        price_cents
       FROM sms_messages
       WHERE contact_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [contactId, validLimit, validOffset]
    );

    return NextResponse.json({
      messages: result.rows.map(row => ({
        id: row.id,
        direction: row.direction,
        body: row.body,
        status: row.status,
        to: row.to_number,
        from: row.from_number,
        createdAt: row.created_at,
        sentAt: row.sent_at,
        deliveredAt: row.delivered_at,
        errorMessage: row.error_message,
        segments: row.segments,
        priceCents: row.price_cents,
      })),
      pagination: {
        total: totalMessages,
        limit: validLimit,
        offset: validOffset,
        hasMore: validOffset + validLimit < totalMessages,
      },
    });
  } catch (error: any) {
    console.error('Get conversation messages error:', error);
    
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

