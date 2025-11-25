import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/api/_lib/db';
import { generateToken } from '@/app/api/_lib/auth-utils';

/**
 * POST /api/auth/verify-code
 * Body: { email: string, code: string }
 *
 * Verifies a 6-digit email verification code and logs the user in on success.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and verification code are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const trimmedCode = String(code).trim();

    // Look up user by email (case-insensitive comparison)
    const userResult = await query(
      `SELECT id, email, email_confirmed_at
       FROM auth.users
       WHERE LOWER(TRIM(email)) = $1`,
      [normalizedEmail]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or verification code' },
        { status: 400 }
      );
    }

    const user = userResult.rows[0] as {
      id: string;
      email: string;
      email_confirmed_at: string | null;
    };

    // Check the verification_codes table (used for both signup and login)
    const codeResult = await query(
      `SELECT id, code, expires_at
       FROM verification_codes
       WHERE LOWER(TRIM(email)) = $1
         AND code = $2
         AND expires_at > NOW()
       LIMIT 1`,
      [normalizedEmail, trimmedCode]
    );

    if (codeResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    // Mark email as verified and delete the used code
    await query('BEGIN');
    try {
      await query(
        `UPDATE auth.users
         SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
         WHERE id = $1`,
        [user.id]
      );

      // Delete the used verification code
      await query(
        `DELETE FROM verification_codes
         WHERE LOWER(TRIM(email)) = $1`,
        [normalizedEmail]
      );

      await query('COMMIT');
    } catch (txError: any) {
      await query('ROLLBACK');
      throw txError;
    }

    // Fetch user profile for client
    const profileResult = await query(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [user.id]
    );

    if (profileResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const profile = profileResult.rows[0];

    // Generate JWT and log the user in
    const jwtToken = generateToken({
      userId: user.id,
      email: user.email,
    });

    return NextResponse.json({
      success: true,
      token: jwtToken,
      user: {
        id: profile.id,
        email: user.email,
        fullName: profile.full_name,
        phoneNumber: profile.phone_number,
        smsBalance: profile.sms_balance,
      },
    });
  } catch (error: any) {
    console.error('[AUTH] Verify code error:', error);
    return NextResponse.json(
      { error: 'Failed to verify code' },
      { status: 500 }
    );
  }
}


