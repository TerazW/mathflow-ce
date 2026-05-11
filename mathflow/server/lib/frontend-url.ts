import type { Request } from 'express';

/**
 * Resolve the frontend URL for use in emails, redirects, etc.
 *
 * Priority:
 *  1. FRONTEND_URL env var (explicit config — recommended for production)
 *  2. Origin header (set by browsers on cross-origin requests)
 *  3. Referer header (fallback — extract origin from full URL)
 *  4. Request host (last resort — may be the API domain if frontend/backend are split)
 */
export function getFrontendUrl(req: Request): string {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.replace(/\/+$/, '');
  }

  const origin = req.headers['origin'];
  if (origin && typeof origin === 'string') {
    return origin.replace(/\/+$/, '');
  }

  const referer = req.headers['referer'];
  if (referer && typeof referer === 'string') {
    try {
      const url = new URL(referer);
      return `${url.protocol}//${url.host}`;
    } catch { /* fall through */ }
  }

  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${protocol}://${host}`;
}
