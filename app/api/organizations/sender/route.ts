import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/app/api/_lib/auth-utils';
import { query } from '@/app/api/_lib/db';
import { provisionOrgTollFreeNumber } from '@/app/api/_lib/twilio-provisioning';

/**
 * GET /api/organizations/sender
 * Returns the current org SMS sender number and status
 */
export async function GET(request: NextRequest) {
  try {
    const { orgId } = await authenticateRequest(request);

    if (!orgId) {
      return NextResponse.json(
        { hasNumber: false, number: null, status: 'none' },
        { status: 200 }
      );
    }

    // First check new phone_numbers table for primary number
    const phoneNumbersResult = await query(
      `SELECT phone_number, status
       FROM phone_numbers
       WHERE org_id = $1 AND is_primary = true
       LIMIT 1`,
      [orgId]
    );

    if (phoneNumbersResult.rows.length > 0) {
      const row = phoneNumbersResult.rows[0];
      return NextResponse.json(
        {
          hasNumber: true,
          number: row.phone_number,
          status: row.status || 'none',
        },
        { status: 200 }
      );
    }

    // Fallback to old organizations table for backward compatibility
    const result = await query(
      `SELECT sms_sender_number, sms_sender_status
       FROM organizations
       WHERE id = $1`,
      [orgId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { hasNumber: false, number: null, status: 'none' },
        { status: 200 }
      );
    }

    const row = result.rows[0] as {
      sms_sender_number: string | null;
      sms_sender_status: string | null;
    };

    return NextResponse.json(
      {
        hasNumber: !!row.sms_sender_number,
        number: row.sms_sender_number,
        status: row.sms_sender_status || 'none',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[ORG SENDER] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load organization sender info' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations/sender
 * Provision a toll-free number for the org if they don't have one
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

    console.log(`[ORG SENDER] Provision request from user ${userId} for org ${orgId}`);

    // First check new phone_numbers table
    const existingPhoneNumbers = await query(
      `SELECT phone_number, status FROM phone_numbers WHERE org_id = $1 LIMIT 1`,
      [orgId]
    );

    if (existingPhoneNumbers.rows.length > 0) {
      const row = existingPhoneNumbers.rows[0];
      return NextResponse.json(
        {
          success: true,
          number: row.phone_number,
          status: row.status || 'awaiting_verification',
        },
        { status: 200 }
      );
    }

    // Fallback: Check old organizations table
    const existing = await query(
      `SELECT sms_sender_number, sms_sender_status
       FROM organizations
       WHERE id = $1`,
      [orgId]
    );

    if (existing.rows.length > 0 && existing.rows[0].sms_sender_number) {
      return NextResponse.json(
        {
          success: true,
          number: existing.rows[0].sms_sender_number,
          status: existing.rows[0].sms_sender_status || 'awaiting_verification',
        },
        { status: 200 }
      );
    }

    // Provision a new toll-free number via Twilio
    const { phoneNumber, phoneSid } = await provisionOrgTollFreeNumber(orgId);

    // Store in new phone_numbers table (preferred)
    const insertResult = await query(
      `INSERT INTO phone_numbers (org_id, phone_number, phone_sid, type, status, is_primary, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING phone_number, status`,
      [orgId, phoneNumber, phoneSid, 'toll-free', 'awaiting_verification', true, userId]
    );

    // Also update organizations table for backward compatibility
    await query(
      `UPDATE organizations
       SET sms_sender_number = $1,
           sms_sender_status = 'awaiting_verification',
           updated_at = NOW()
       WHERE id = $2`,
      [phoneNumber, orgId]
    );

    console.log('[ORG SENDER] Provisioned toll-free number for org:', {
      orgId,
      phoneNumber,
      phoneSid,
    });

    return NextResponse.json(
      {
        success: true,
        number: phoneNumber,
        status: 'awaiting_verification',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[ORG SENDER] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to provision sender number' },
      { status: 500 }
    );
  }
}


