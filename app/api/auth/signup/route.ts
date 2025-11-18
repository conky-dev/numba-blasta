import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/app/api/_lib/auth-utils';
import { query } from '@/app/api/_lib/db';
import { sendEmailVerification } from '@/app/api/_lib/email';

const ALLOWED_SIGNUP_DOMAIN = '@goldlevelmarketing.com';

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json();

    // Basic validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Restrict signups to allowed domain
    if (!normalizedEmail.endsWith(ALLOWED_SIGNUP_DOMAIN) && normalizedEmail !== "hazeldinesunshine@gmail.com") {
      return NextResponse.json(
        { error: `Signups are restricted.` },
        { status: 403 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    console.log('[AUTH] Creating user account:', normalizedEmail);

    // Check if user already exists in auth.users (case-insensitive comparison)
    const existingAuthUser = await query(
      `SELECT id, email_confirmed_at
       FROM auth.users
       WHERE LOWER(TRIM(email)) = $1`,
      [normalizedEmail]
    );

    if (existingAuthUser.rows.length > 0) {
      const existing = existingAuthUser.rows[0] as {
        id: string;
        email_confirmed_at: string | null;
      };

      // If user exists but email is NOT verified, just regenerate a code and reuse that account
      if (!existing.email_confirmed_at) {
        console.log('[AUTH] Existing unverified user found, regenerating verification code');

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await query(
          `INSERT INTO email_verification_tokens (user_id, token, expires_at)
           VALUES ($1, $2, $3)`,
          [existing.id, verificationCode, expiresAt]
        );

        sendEmailVerification(normalizedEmail, verificationCode).catch(err => {
          console.error('[AUTH] Failed to resend verification email on signup:', err);
        });

        return NextResponse.json({
          success: true,
          message:
            'This email is already registered but not verified. We have sent you a new verification code.',
          userId: existing.id,
        });
      }

      // If email is already verified, block duplicate signup
      return NextResponse.json(
        { error: 'User with this email already exists. Please log in instead.' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate UUID for the user
    const userIdResult = await query('SELECT uuid_generate_v4() as id');
    const userId = userIdResult.rows[0].id;

    // Create auth.users entry
    console.log('[AUTH] Creating auth.users entry...');
    await query(
      `INSERT INTO auth.users (
        id,
        email, 
        encrypted_password, 
        raw_user_meta_data,
        email_confirmed_at,
        aud,
        role
       )
       VALUES ($1, $2, $3, $4, NULL, 'authenticated', 'authenticated')`,
      [userId, normalizedEmail, hashedPassword, JSON.stringify({ full_name: fullName || '' })]
    );

    console.log('[SUCCESS] auth.users created (email not yet verified)');

    // The trigger will automatically create user_profiles entry (from 01_user_profiles.sql trigger)
    // Wait a moment for trigger to complete
    await new Promise(resolve => setTimeout(resolve, 150));

    // Verify profile was created
    const profileCheck = await query(
      'SELECT id FROM user_profiles WHERE user_id = $1',
      [userId]
    );

    if (profileCheck.rows.length === 0) {
      console.warn('[WARNING] Profile not created by trigger, creating manually...');
      await query(
        `INSERT INTO user_profiles (user_id, full_name, sms_balance)
         VALUES ($1, $2, 0.00)`,
        [userId, fullName || '']
      );
    }

    console.log('[SUCCESS] User account created successfully (no org - will be created via onboarding)');

    // Create email verification code (6 digits, 24h expiry)
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    await query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, verificationCode, expiresAt]
    );

    // Fire-and-forget email; errors here should not block signup
    sendEmailVerification(normalizedEmail, verificationCode).catch(err => {
      console.error('[AUTH] Failed to send verification email:', err);
    });

    // Do NOT auto-login; require email verification first
    return NextResponse.json({
      success: true,
      message: 'Account created. Please check your email to verify your address before logging in.',
      userId,
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during signup' },
      { status: 500 }
    );
  }
}
