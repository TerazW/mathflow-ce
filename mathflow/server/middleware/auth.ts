import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not set. Auth endpoints will not work. Set JWT_SECRET in your environment variables.');
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

/**
 * Middleware that refreshes the user's plan from the database.
 * Use on plan-sensitive routes (collaboration, sharing, versions) to ensure
 * the JWT's potentially stale plan field doesn't grant expired privileges.
 */
export function refreshPlan(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) { next(); return; }
  // Lazy import to avoid circular dependency
  const { sql } = require('../db/connection');
  if (!sql) { next(); return; }
  sql`SELECT plan FROM users WHERE id = ${req.user.id}`
    .then((result: any[]) => {
      if (result.length > 0 && req.user) {
        req.user.plan = result[0].plan;
      }
      next();
    })
    .catch(() => next());
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
