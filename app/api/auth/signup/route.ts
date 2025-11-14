import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { hashPassword } from '@/lib/auth-utils';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  // ============================================================================
  // SIGNUPS DISABLED
  // ============================================================================
  // Signups are currently disabled. Uncomment the code below to re-enable.
  // ============================================================================
  
  return NextResponse.json(
    { error: 'Signups are currently disabled' },
    { status: 403 }
  );

  /* COMMENTED OUT - SIGNUP CODE
  try {
    const { email, password, fullName } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    console.log('[AUTH] Creating user account:', email);

    // Check if user already exists in auth.users
    const existingAuthUser = await query(
      'SELECT id FROM auth.users WHERE email = $1',
      [email]
    );

    if (existingAuthUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
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
       VALUES ($1, $2, $3, $4, NOW(), 'authenticated', 'authenticated')`,
      [userId, email, hashedPassword, JSON.stringify({ full_name: fullName || '' })]
    );

    console.log('[SUCCESS] auth.users created');

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

    // Generate JWT token for auto-login
    const token = jwt.sign(
      {
        userId,
        email,
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Set the token in a cookie
    const response = NextResponse.json({
      success: true,
      message: 'Account created successfully. You are now logged in.',
      userId,
      token,
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during signup' },
      { status: 500 }
    );
  }
  */
}
