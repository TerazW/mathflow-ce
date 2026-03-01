// SPDX-License-Identifier: AGPL-3.0-only

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'MathFlow <noreply@mathflow.studio>';

export function isEmailConfigured(): boolean {
  return Boolean(RESEND_API_KEY);
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    throw new Error('Email is not configured (RESEND_API_KEY missing)');
  }

  const { Resend } = await import('resend');
  const resend = new Resend(RESEND_API_KEY);

  await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject,
    html,
  });
}

export async function sendVerificationEmail(
  email: string,
  token: string,
  frontendUrl: string,
  displayName?: string,
): Promise<void> {
  const verifyUrl = `${frontendUrl}#verify=${token}`;
  const name = displayName || 'there';

  await sendEmail(
    email,
    'Verify your MathFlow account',
    `<p>Hi ${name},</p>
     <p>Please verify your email by clicking the link below:</p>
     <p><a href="${verifyUrl}">${verifyUrl}</a></p>
     <p>This link expires in 24 hours.</p>`,
  );
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
  frontendUrl: string,
  _displayName?: string,
): Promise<void> {
  const resetUrl = `${frontendUrl}#reset=${token}`;

  await sendEmail(
    email,
    'Reset your MathFlow password',
    `<p>You requested a password reset.</p>
     <p>Click the link below to set a new password:</p>
     <p><a href="${resetUrl}">${resetUrl}</a></p>
     <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`,
  );
}
