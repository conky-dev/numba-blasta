import { NextResponse } from 'next/server';

// Support both legacy and current env names
const POSTMARK_API_TOKEN = process.env.POSTMARK_API_TOKEN || process.env.POSTMARK_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL || process.env.POSTMARK_FROM_EMAIL;
const SENDER_NAME = process.env.SENDER_NAME || 'SMSblast';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Send an email verification message using Postmark's HTTP API.
 * We avoid adding a new dependency by using fetch directly.
 */
export async function sendEmailVerification(email: string, code: string) {
  if (!POSTMARK_API_TOKEN || !SENDER_EMAIL) {
    console.warn(
      '[EMAIL] Postmark not configured. Skipping verification email for',
      email
    );
    return;
  }

  const verifyUrl = `${APP_URL.replace(/\/$/, '')}/api/auth/verify-email?token=${encodeURIComponent(
    code
  )}`;

  const subject = 'Verify your SMSblast account';

  const textBody = [
    'Welcome to SMSblast!',
    '',
    'Please verify your email address by entering the verification code below in the app, or by clicking the link.',
    '',
    `Verification code: ${code}`,
    verifyUrl,
    '',
    'If you did not request this, you can ignore this email.',
  ].join('\n');

  const htmlBody = `
    <p>Welcome to <strong>SMSblast</strong>!</p>
    <p>Please verify your email address by entering the verification code below in the app, or by clicking the button.</p>
    <p><strong>Verification code:</strong> ${code}</p>
    <p>
      <a href="${verifyUrl}" style="
        display:inline-block;
        padding:10px 16px;
        background-color:#2563eb;
        color:#ffffff;
        text-decoration:none;
        border-radius:4px;
        font-weight:600;
      ">
        Verify Email
      </a>
    </p>
    <p>Or copy and paste this link into your browser:</p>
    <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    <p>If you did not request this, you can ignore this email.</p>
  `;

  await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Postmark-Server-Token': POSTMARK_API_TOKEN,
    },
    body: JSON.stringify({
      From: SENDER_NAME ? `${SENDER_NAME} <${SENDER_EMAIL}>` : SENDER_EMAIL,
      To: email,
      Subject: subject,
      TextBody: textBody,
      HtmlBody: htmlBody,
      MessageStream: 'outbound',
    }),
  });
}

/**
 * Send a password reset email using Postmark's HTTP API.
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetToken: string,
  expiresInMinutes: number = 60
): Promise<void> {
  if (!POSTMARK_API_TOKEN || !SENDER_EMAIL) {
    console.warn(
      '[EMAIL] Postmark not configured. Skipping password reset email for',
      email
    );
    return;
  }

  const resetUrl = `${APP_URL.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(resetToken)}`;
  
  const subject = 'Password Reset Request - SMSblast';

  const textBody = [
    `Hi ${name},`,
    '',
    'We received a request to reset your password for your SMSblast account.',
    '',
    '⚠️ Security Notice: If you didn\'t request this password reset, please ignore this email. Your password will remain unchanged.',
    '',
    'Click the link below to reset your password:',
    resetUrl,
    '',
    `This link will expire in ${expiresInMinutes} minutes.`,
    '',
    'If you\'re having trouble, contact support.',
    '',
    'Best regards,',
    'The SMSblast Team'
  ].join('\n');

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb;">Password Reset Request</h2>
      <p>Hi ${name},</p>
      <p>We received a request to reset your password for your SMSblast account.</p>
      
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; color: #92400e;">
          <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
        </p>
      </div>

      <p>Click the button below to reset your password:</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" 
           style="background-color: #2563eb; color: white; padding: 14px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
          Reset Password
        </a>
      </div>

      <p style="color: #6b7280; font-size: 14px;">
        Or copy and paste this link into your browser:<br>
        <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
      </p>

      <p style="color: #6b7280; font-size: 14px;">
        This link will expire in ${expiresInMinutes} minutes for security purposes.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

      <p style="color: #9ca3af; font-size: 12px; text-align: center;">
        If you're having trouble, contact support at support@smsblast.io
      </p>
    </div>
  `;

  await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Postmark-Server-Token': POSTMARK_API_TOKEN,
    },
    body: JSON.stringify({
      From: SENDER_NAME ? `${SENDER_NAME} <${SENDER_EMAIL}>` : SENDER_EMAIL,
      To: email,
      Subject: subject,
      TextBody: textBody,
      HtmlBody: htmlBody,
      MessageStream: 'outbound',
    }),
  });
}

