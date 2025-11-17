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


