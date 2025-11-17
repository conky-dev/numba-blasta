import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/app/api/_lib/auth-utils';
import { query } from '@/app/api/_lib/db';

/**
 * PATCH /api/organizations/phone-numbers/[id]
 * Update a phone number (e.g., set as primary, update status)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await authenticateRequest(request);
    const { id } = await params;

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { isPrimary, status } = body;

    // Verify the phone number belongs to this org
    const verifyResult = await query(
      `SELECT org_id FROM phone_numbers WHERE id = $1`,
      [id]
    );

    if (verifyResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Phone number not found' },
        { status: 404 }
      );
    }

    if (verifyResult.rows[0].org_id !== orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // If setting as primary, unset all other primary numbers
    if (isPrimary === true) {
      await query(
        `UPDATE phone_numbers
         SET is_primary = false
         WHERE org_id = $1 AND id != $2`,
        [orgId, id]
      );

      // Update organizations table for backward compatibility
      const numberResult = await query(
        `SELECT phone_number, status FROM phone_numbers WHERE id = $1`,
        [id]
      );

      if (numberResult.rows.length > 0) {
        await query(
          `UPDATE organizations
           SET sms_sender_number = $1,
               sms_sender_status = $2,
               updated_at = NOW()
           WHERE id = $3`,
          [numberResult.rows[0].phone_number, numberResult.rows[0].status || 'awaiting_verification', orgId]
        );
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (isPrimary !== undefined) {
      updates.push(`is_primary = $${paramIndex}`);
      values.push(isPrimary);
      paramIndex++;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    await query(
      `UPDATE phone_numbers
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}`,
      values
    );

    // Fetch updated phone number
    const result = await query(
      `SELECT id, phone_number, phone_sid, type, status, is_primary, created_at
       FROM phone_numbers
       WHERE id = $1`,
      [id]
    );

    const phoneNumber = result.rows[0];

    return NextResponse.json(
      {
        success: true,
        phoneNumber: {
          id: phoneNumber.id,
          number: phoneNumber.phone_number,
          phoneSid: phoneNumber.phone_sid,
          type: phoneNumber.type,
          status: phoneNumber.status,
          isPrimary: phoneNumber.is_primary,
          createdAt: phoneNumber.created_at,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[PHONE NUMBERS] PATCH error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update phone number' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizations/phone-numbers/[id]
 * Delete a phone number (only if not primary)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await authenticateRequest(request);
    const { id } = await params;

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 }
      );
    }

    // Verify the phone number belongs to this org and get its details
    const verifyResult = await query(
      `SELECT org_id, is_primary FROM phone_numbers WHERE id = $1`,
      [id]
    );

    if (verifyResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Phone number not found' },
        { status: 404 }
      );
    }

    if (verifyResult.rows[0].org_id !== orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Prevent deletion of primary number
    if (verifyResult.rows[0].is_primary) {
      return NextResponse.json(
        { error: 'Cannot delete primary phone number. Set another number as primary first.' },
        { status: 400 }
      );
    }

    // Delete the phone number
    await query(
      `DELETE FROM phone_numbers WHERE id = $1`,
      [id]
    );

    return NextResponse.json(
      { success: true, message: 'Phone number deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[PHONE NUMBERS] DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete phone number' },
      { status: 500 }
    );
  }
}

