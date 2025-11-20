import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/api/_lib/db';
import { sendPasswordResetEmail } from '@/app/api/_lib/email';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/forgot-password
 * Request a password reset link
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const userResult = await query(
      `SELECT au.id, au.email, up.full_name
       FROM auth.users au
       JOIN user_profiles up ON up.user_id = au.id
       WHERE LOWER(TRIM(au.email)) = $1`,
      [normalizedEmail]
    );

    // For security, always return success even if email doesn't exist
    // This prevents email enumeration attacks
    if (userResult.rows.length === 0) {
      console.log(`⚠️ Password reset requested for non-existent email: ${normalizedEmail}`);
      return NextResponse.json(
        { message: 'If an account exists with that email, a password reset link has been sent.' },
        { status: 200 }
      );
    }

    const user = userResult.rows[0];
    const userName = user.full_name || 'User';

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Get client IP address for logging
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // Store reset token in database
    await query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [user.id, resetToken, expiresAt, ipAddress]
    );

    // Send password reset email
    try {
      await sendPasswordResetEmail(
        user.email,
        userName,
        resetToken,
        60 // expires in 60 minutes
      );
      
      console.log(`✅ Password reset email sent to: ${user.email}`);
    } catch (emailError: any) {
      console.error('❌ Failed to send password reset email:', emailError);
      // Don't expose email sending errors to the user
      // The token is still valid in case we need to resend manually
    }

    return NextResponse.json(
      { message: 'If an account exists with that email, a password reset link has been sent.' },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}

