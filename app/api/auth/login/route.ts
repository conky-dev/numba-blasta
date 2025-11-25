import { NextRequest, NextResponse } from 'next/server';
import { comparePassword, generateToken } from '@/app/api/_lib/auth-utils';
import { query } from '@/app/api/_lib/db';
import { sendLoginVerificationCode } from '@/app/api/_lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Normalize email to lowercase (case-insensitive login)
    const normalizedEmail = String(email).trim().toLowerCase();

    // Find user in auth.users (case-insensitive comparison)
    const authResult = await query(
      `SELECT id, email, encrypted_password, email_confirmed_at
       FROM auth.users
       WHERE LOWER(TRIM(email)) = $1`,
      [normalizedEmail]
    );

    if (authResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const authUser = authResult.rows[0] as {
      id: string;
      email: string;
      encrypted_password: string;
      email_confirmed_at: string | null;
    };

    // Verify password
    const isValidPassword = await comparePassword(
      password,
      authUser.encrypted_password
    );

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate and send verification code (always required for login)
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store the verification code
    await query(
      `INSERT INTO verification_codes (email, code, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) 
       DO UPDATE SET code = $2, expires_at = $3, created_at = NOW()`,
      [authUser.email, verificationCode, expiresAt]
    );

    // Send verification email
    try {
      await sendLoginVerificationCode(authUser.email, verificationCode);
    } catch (emailError: any) {
      console.error('Failed to send verification email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send verification code. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
      requiresVerification: true,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
