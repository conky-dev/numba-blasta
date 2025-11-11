import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth-utils';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
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

    console.log('🔐 Creating user account:', email);

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
    console.log('📝 Creating auth.users entry...');
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

    console.log('✅ auth.users created');

    // The triggers will automatically create:
    // 1. user_profiles entry (from 01_user_profiles.sql trigger)
    // 2. organizations + organization_members (from 04_organizations.sql trigger)
    // Wait a moment for triggers to complete
    await new Promise(resolve => setTimeout(resolve, 150));

    // Verify profile was created
    const profileCheck = await query(
      'SELECT id FROM user_profiles WHERE user_id = $1',
      [userId]
    );

    if (profileCheck.rows.length === 0) {
      console.warn('⚠️  Profile not created by trigger, creating manually...');
      await query(
        `INSERT INTO user_profiles (user_id, full_name, sms_balance)
         VALUES ($1, $2, 0.00)`,
        [userId, fullName || '']
      );
    }

    // Verify organization was created
    const orgCheck = await query(
      'SELECT org_id FROM organization_members WHERE user_id = $1',
      [userId]
    );

    if (orgCheck.rows.length === 0) {
      console.warn('⚠️  Organization not created by trigger, creating manually...');
      
      // Create organization
      const orgResult = await query(
        `INSERT INTO organizations (name, email)
         VALUES ($1, $2)
         RETURNING id`,
        [`${fullName || 'User'}'s Organization`, email]
      );
      
      const orgId = orgResult.rows[0].id;
      
      // Add user as owner
      await query(
        `INSERT INTO organization_members (org_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [orgId, userId]
      );
    }

    console.log('✅ User account created successfully');

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. You can now log in.',
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
