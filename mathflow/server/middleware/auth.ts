// SPDX-License-Identifier: AGPL-3.0-only
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const KNOWN_PLACEHOLDERS = [
  'change-this-to-a-random-32-char-string',
  'change-this-to-a-random-string-at-least-32-characters',
];

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not set. Auth endpoints will not work. Set JWT_SECRET in your environment variables.');
} else if (KNOWN_PLACEHOLDERS.includes(JWT_SECRET)) {
  console.error('FATAL: JWT_SECRET is set to a known placeholder value. Please generate a real secret (e.g. openssl rand -base64 32). Auth will refuse to start.');
  process.exit(1);
}

function getJWTSecret(): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }
  return JWT_SECRET;
}

export interface AuthUser {
  id: string;
  email: string;
  plan: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, plan: user.plan },
    getJWTSecret(),
    { expiresIn: '7d', algorithm: 'HS256' }
  );
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, getJWTSecret(), { algorithms: ['HS256'] }) as AuthUser;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const token = authHeader.split(' ')[1];
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      req.user = verifyToken(token);
    } catch {
      // Token invalid, continue as unauthenticated
    }
  }
  next();
}
