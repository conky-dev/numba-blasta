import { NextRequest, NextResponse } from 'next/server';
import { comparePassword, generateToken } from '../../_lib/auth-utils';
import { query } from '../../_lib/db';

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

    // Find user in auth.users
    const authResult = await query(
      'SELECT id, email, encrypted_password FROM auth.users WHERE email = $1',
      [email]
    );

    if (authResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const authUser = authResult.rows[0];

    // Verify password
    const isValidPassword = await comparePassword(password, authUser.encrypted_password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Get user profile
    const profileResult = await query(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [authUser.id]
    );

    if (profileResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const profile = profileResult.rows[0];

    // Generate JWT token
    const token = generateToken({
      userId: authUser.id,
      email: authUser.email,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: profile.id,
        email: authUser.email,
        fullName: profile.full_name,
        phoneNumber: profile.phone_number,
        smsBalance: profile.sms_balance,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
