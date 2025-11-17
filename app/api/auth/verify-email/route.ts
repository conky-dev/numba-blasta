import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/api/_lib/db';

/**
 * GET /api/auth/verify-email?token=...
 * Verifies an email verification token and marks the user as confirmed.
 * Redirects back to the login page with a status flag.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { error: 'Missing verification token' },
      { status: 400 }
    );
  }

  try {
    // Look up token that is not used and not expired
    const result = await query(
      `SELECT evt.id, evt.user_id
       FROM email_verification_tokens evt
       WHERE evt.token = $1
         AND evt.used_at IS NULL
         AND evt.expires_at > NOW()
       LIMIT 1`,
      [token]
    );

    if (result.rows.length === 0) {
      // Invalid or expired token
      const redirectUrl = new URL('/', url.origin);
      redirectUrl.searchParams.set('verification', 'invalid');
      return NextResponse.redirect(redirectUrl);
    }

    const { user_id } = result.rows[0] as { user_id: string };

    // Mark token as used and set email_confirmed_at on user
    await query('BEGIN');
    try {
      await query(
        `UPDATE email_verification_tokens
         SET used_at = NOW()
         WHERE token = $1`,
        [token]
      );

      await query(
        `UPDATE auth.users
         SET email_confirmed_at = NOW()
         WHERE id = $1`,
        [user_id]
      );

      await query('COMMIT');
    } catch (txError: any) {
      await query('ROLLBACK');
      throw txError;
    }

    const redirectUrl = new URL('/', url.origin);
    redirectUrl.searchParams.set('verification', 'success');
    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error('[AUTH] Email verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 }
    );
  }
}


