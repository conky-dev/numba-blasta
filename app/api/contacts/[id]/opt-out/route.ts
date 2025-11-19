import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/app/api/_lib/auth-utils';
import { query } from '@/app/api/_lib/db';

/**
 * POST /api/contacts/:id/opt-out
 * Manually opt out a contact
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await authenticateRequest(request);
    const { id: contactId } = await params;

    // Verify contact exists and belongs to org
    const contactResult = await query(
      `SELECT id, phone, first_name, last_name, opted_out_at
       FROM contacts
       WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
      [contactId, orgId]
    );

    if (contactResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    const contact = contactResult.rows[0];

    // Check if already opted out
    if (contact.opted_out_at) {
      return NextResponse.json(
        { error: 'Contact is already opted out' },
        { status: 400 }
      );
    }

    // Opt out the contact
    await query(
      `UPDATE contacts
       SET opted_out_at = NOW(),
           updated_at = NOW()
       WHERE id = $1 AND org_id = $2`,
      [contactId, orgId]
    );

    // Refresh materialized view
    await query('REFRESH MATERIALIZED VIEW CONCURRENTLY contact_category_counts');

    console.log(`[OPT-OUT] Contact ${contactId} (${contact.phone}) opted out by user ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Contact opted out successfully',
      contact: {
        id: contactId,
        phone: contact.phone,
        name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
      }
    });
  } catch (error: any) {
    console.error('Opt-out contact error:', error);

    if (error.message?.includes('token') || error.message?.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to opt out contact' },
      { status: 500 }
    );
  }
}

