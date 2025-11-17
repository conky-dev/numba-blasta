import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/app/api/_lib/auth-utils';
import { query } from '@/app/api/_lib/db';
import { provisionOrgTollFreeNumber } from '@/app/api/_lib/twilio-provisioning';

/**
 * GET /api/organizations/phone-numbers
 * Returns all phone numbers for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const { orgId } = await authenticateRequest(request);

    if (!orgId) {
      return NextResponse.json(
        { phoneNumbers: [] },
        { status: 200 }
      );
    }

    const result = await query(
      `SELECT id, phone_number, phone_sid, type, status, is_primary, created_at
       FROM phone_numbers
       WHERE org_id = $1
       ORDER BY is_primary DESC, created_at DESC`,
      [orgId]
    );

    const phoneNumbers = result.rows.map((row) => ({
      id: row.id,
      number: row.phone_number,
      phoneSid: row.phone_sid,
      type: row.type || 'toll-free',
      status: row.status || 'none',
      isPrimary: row.is_primary || false,
      createdAt: row.created_at,
    }));

    return NextResponse.json(
      { phoneNumbers },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[PHONE NUMBERS] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load phone numbers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations/phone-numbers
 * Provision a new phone number for the organization
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await authenticateRequest(request);

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 }
      );
    }

    console.log(`[PHONE NUMBERS] Provision request from user ${userId} for org ${orgId}`);

    // Provision a new toll-free number via Twilio
    const { phoneNumber, phoneSid } = await provisionOrgTollFreeNumber(orgId);

    // Check if this is the first number (make it primary)
    const existingCount = await query(
      `SELECT COUNT(*) as count FROM phone_numbers WHERE org_id = $1`,
      [orgId]
    );
    const isFirstNumber = existingCount.rows[0]?.count === '0';

    // Store in phone_numbers table
    const insertResult = await query(
      `INSERT INTO phone_numbers (org_id, phone_number, phone_sid, type, status, is_primary, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, phone_number, phone_sid, type, status, is_primary, created_at`,
      [orgId, phoneNumber, phoneSid, 'toll-free', 'awaiting_verification', isFirstNumber, userId]
    );

    const newNumber = insertResult.rows[0];

    // Also update organizations table for backward compatibility (set as primary if first)
    if (isFirstNumber) {
      await query(
        `UPDATE organizations
         SET sms_sender_number = $1,
             sms_sender_status = 'awaiting_verification',
             updated_at = NOW()
         WHERE id = $2`,
        [phoneNumber, orgId]
      );
    }

    console.log('[PHONE NUMBERS] Provisioned toll-free number for org:', {
      orgId,
      phoneNumber,
      phoneSid,
      isPrimary: isFirstNumber,
    });

    return NextResponse.json(
      {
        success: true,
        phoneNumber: {
          id: newNumber.id,
          number: newNumber.phone_number,
          phoneSid: newNumber.phone_sid,
          type: newNumber.type,
          status: newNumber.status,
          isPrimary: newNumber.is_primary,
          createdAt: newNumber.created_at,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[PHONE NUMBERS] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to provision phone number' },
      { status: 500 }
    );
  }
}

