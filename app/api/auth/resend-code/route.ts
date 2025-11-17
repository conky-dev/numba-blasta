import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/api/_lib/db';
import { sendEmailVerification } from '@/app/api/_lib/email';

/**
 * POST /api/auth/resend-code
 * Body: { email: string }
 *
 * Regenerates and resends an email verification code.
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Look up user by email
    const userResult = await query(
      `SELECT id, email, email_confirmed_at
       FROM auth.users
       WHERE email = $1`,
      [normalizedEmail]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No account found for that email address' },
        { status: 400 }
      );
    }

    const user = userResult.rows[0] as {
      id: string;
      email: string;
      email_confirmed_at: string | null;
    };

    if (user.email_confirmed_at) {
      return NextResponse.json(
        { error: 'This email address is already verified.' },
        { status: 400 }
      );
    }

    // Create a new 6-digit verification code (24h expiry)
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, verificationCode, expiresAt]
    );

    // Fire-and-forget resend
    sendEmailVerification(user.email, verificationCode).catch(err => {
      console.error('[AUTH] Failed to resend verification email:', err);
    });

    return NextResponse.json({
      success: true,
      message: 'A new verification code has been sent to your email.',
    });
  } catch (error: any) {
    console.error('[AUTH] Resend code error:', error);
    return NextResponse.json(
      { error: 'Failed to resend verification code' },
      { status: 500 }
    );
  }
}


