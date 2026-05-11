/**
 * Email service — CE no-op stub.
 *
 * The production build uses Resend for email verification, password reset,
 * and collaboration invites. CE ships a stub that reports email as
 * unconfigured, so the routes that gate on `isEmailConfigured()` return
 * HTTP 501 instead of crashing.
 *
 * If you self-host CE and want real email, replace this file with an
 * implementation that exports the same four functions. The simplest path
 * is to install `resend` and copy the production version. See
 * https://github.com/TerazW/mathflow-ce#email for guidance.
 */

export function isEmailConfigured(): boolean {
  return false;
}

function unavailable(): never {
  throw new Error(
    'Email is not configured in this CE build. Provide your own services/email.ts.',
  );
}

export async function sendVerificationEmail(
  _to: string,
  _token: string,
  _frontendUrl: string,
  _displayName?: string | null,
): Promise<void> {
  unavailable();
}

export async function sendPasswordResetEmail(
  _to: string,
  _token: string,
  _frontendUrl: string,
  _displayName?: string | null,
): Promise<void> {
  unavailable();
}

export async function sendCollaborationInviteEmail(
  _to: string,
  _token: string,
  _inviterName: string,
  _noteTitle: string,
  _permission: string,
  _frontendUrl: string,
): Promise<void> {
  unavailable();
}
