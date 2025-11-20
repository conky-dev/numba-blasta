import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/api/_lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Find the reset token and get user info
    const tokenResult = await query(
      `SELECT rt.id, rt.user_id, rt.expires_at, au.email, up.full_name
       FROM password_reset_tokens rt
       JOIN auth.users au ON au.id = rt.user_id
       JOIN user_profiles up ON up.user_id = rt.user_id
       WHERE rt.token = $1 AND rt.used = FALSE`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    const resetToken = tokenResult.rows[0];

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(resetToken.expires_at);
    
    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'Reset token has expired. Please request a new password reset.' },
        { status: 400 }
      );
    }

    console.log('🔑 Attempting to update password for user_id:', resetToken.user_id);
    console.log('🔑 User email:', resetToken.email);

    // Hash the new password using bcryptjs
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password directly in auth.users table
    await query(
      'UPDATE auth.users SET encrypted_password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, resetToken.user_id]
    );

    console.log('✅ Password updated via direct database update');

    // Mark the token as used
    await query(
      'UPDATE password_reset_tokens SET used = TRUE, used_at = NOW() WHERE id = $1',
      [resetToken.id]
    );

    console.log(`✅ Password reset successful for user ID: ${resetToken.user_id} (${resetToken.email})`);

    return NextResponse.json(
      { message: 'Password has been reset successfully. You can now log in with your new password.' },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/reset-password?token=xxx
 * Validate reset token
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Check if token exists and is valid
    const tokenResult = await query(
      `SELECT rt.id, rt.user_id, rt.expires_at, au.email, up.full_name
       FROM password_reset_tokens rt
       JOIN auth.users au ON au.id = rt.user_id
       JOIN user_profiles up ON up.user_id = rt.user_id
       WHERE rt.token = $1 AND rt.used = FALSE`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return NextResponse.json(
        { valid: false, error: 'Invalid reset token' },
        { status: 200 }
      );
    }

    const resetToken = tokenResult.rows[0];

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(resetToken.expires_at);
    
    if (now > expiresAt) {
      return NextResponse.json(
        { valid: false, error: 'Reset token has expired' },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { 
        valid: true, 
        email: resetToken.email,
        name: resetToken.full_name || ''
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Validate token error:', error);
    return NextResponse.json(
      { error: 'Failed to validate token' },
      { status: 500 }
    );
  }
}

