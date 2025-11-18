import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/app/api/_lib/auth-utils';
import { query } from '@/app/api/_lib/db';
import { provisionOrgTollFreeNumber } from '@/app/api/_lib/twilio-provisioning';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

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
      `SELECT id, phone_number, phone_sid, type, status, is_primary, created_at, verification_sid
       FROM phone_numbers
       WHERE org_id = $1
       ORDER BY is_primary DESC, created_at DESC`,
      [orgId]
    );

    // Check verification status from Twilio for numbers awaiting verification
    const phoneNumbers = await Promise.all(
      result.rows.map(async (row) => {
        let status = row.status || 'none';
        
        // If status is awaiting_verification and we have a phone_sid, check Twilio status
        if ((status === 'awaiting_verification' || status === 'none') && row.phone_sid && accountSid && authToken) {
          try {
            const client = twilio(accountSid, authToken);
            
            // Try to find verification by phone number SID
            const verifications = await client.messaging.v1.tollfreeVerifications.list({
              phoneNumberSid: row.phone_sid,
              limit: 1,
            });

            if (verifications.length > 0) {
              const verification = verifications[0];
              // Map Twilio status to our status
              if (verification.status === 'APPROVED') {
                status = 'verified';
                // Update database if status changed
                if (row.status !== 'verified') {
                  await query(
                    `UPDATE phone_numbers
                     SET status = 'verified',
                         updated_at = NOW()
                     WHERE id = $1`,
                    [row.id]
                  );
                }
              } else if (verification.status === 'REJECTED') {
                status = 'failed';
                // Update database if status changed
                if (row.status !== 'failed') {
                  await query(
                    `UPDATE phone_numbers
                     SET status = 'failed',
                         updated_at = NOW()
                     WHERE id = $1`,
                    [row.id]
                  );
                }
              } else if (verification.status === 'PENDING') {
                status = 'awaiting_verification';
              }
            }
          } catch (error: any) {
            // Silently fail - use database status if Twilio check fails
            console.warn(`[PHONE NUMBERS] Failed to check Twilio status for ${row.id}:`, error.message);
          }
        }

        return {
          id: row.id,
          number: row.phone_number,
          phoneSid: row.phone_sid,
          type: row.type || 'toll-free',
          status: status,
          isPrimary: row.is_primary || false,
          createdAt: row.created_at,
        };
      })
    );

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

