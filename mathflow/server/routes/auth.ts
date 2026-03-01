import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { requireDB } from '../db/connection';
import { generateToken, requireAuth, AuthRequest } from '../middleware/auth';
import { isEmailConfigured, sendVerificationEmail, sendPasswordResetEmail } from '../services/email';
import { getFrontendUrl } from '../lib/frontend-url';

const router = express.Router();

// Rate limiter for auth endpoints — 10 attempts per 15 minutes per IP
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  validate: { trustProxy: false },
});

// POST /api/auth/register
router.post('/register', authRateLimit, async (req, res) => {
  const { email, password, displayName } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  // Require at least one letter and one number
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    res.status(400).json({ error: 'Password must contain at least one letter and one number' });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: 'Invalid email format' });
    return;
  }

  try {
    const sql = requireDB();

    // Check if user exists
    const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`;
    if (existing.length > 0) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const result = await sql`
      INSERT INTO users (email, password_hash, display_name, plan, email_verified, email_verification_token, email_verification_expires)
      VALUES (${email.toLowerCase()}, ${passwordHash}, ${displayName || null}, 'free', FALSE, ${verificationToken}, ${verificationExpires.toISOString()})
      RETURNING id, email, display_name, plan, email_verified
    `;

    const user = result[0];

    // Create default user_settings row
    await sql`INSERT INTO user_settings (user_id) VALUES (${user.id})`;

    // Send verification email (non-blocking — don't fail registration if email fails)
    if (isEmailConfigured()) {
      sendVerificationEmail(user.email, verificationToken, getFrontendUrl(req), user.display_name).catch((err) => {
        console.error('Failed to send verification email:', err.message);
      });
    }

    const token = generateToken({ id: user.id, email: user.email, plan: user.plan });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        plan: user.plan,
        emailVerified: user.email_verified,
      },
      token,
    });
  } catch (error: any) {
    console.error('Registration error:', error.message);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req, res) => {
  const { token } = req.body;

  if (!token || typeof token !== 'string') {
    res.status(400).json({ error: 'Verification token is required' });
    return;
  }

  try {
    const sql = requireDB();

    const result = await sql`
      UPDATE users
      SET email_verified = TRUE,
          email_verification_token = NULL,
          email_verification_expires = NULL
      WHERE email_verification_token = ${token}
        AND email_verification_expires > NOW()
        AND email_verified = FALSE
      RETURNING id, email, plan
    `;

    if (result.length === 0) {
      res.status(400).json({ error: 'Invalid or expired verification link. Please request a new one.' });
      return;
    }

    const user = result[0];
    const jwtToken = generateToken({ id: user.id, email: user.email, plan: user.plan });

    res.json({ message: 'Email verified successfully', token: jwtToken });
  } catch (error: any) {
    console.error('Verify email error:', error.message);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', requireAuth, authRateLimit, async (req: AuthRequest, res) => {
  if (!isEmailConfigured()) {
    res.status(501).json({ error: 'Email service is not configured' });
    return;
  }

  try {
    const sql = requireDB();

    const result = await sql`
      SELECT id, email, display_name, email_verified FROM users WHERE id = ${req.user!.id}
    `;

    if (result.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (result[0].email_verified) {
      res.json({ message: 'Email is already verified' });
      return;
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await sql`
      UPDATE users
      SET email_verification_token = ${verificationToken},
          email_verification_expires = ${verificationExpires.toISOString()}
      WHERE id = ${req.user!.id}
    `;

    await sendVerificationEmail(result[0].email, verificationToken, getFrontendUrl(req), result[0].display_name);

    res.json({ message: 'Verification email sent' });
  } catch (error: any) {
    console.error('Resend verification error:', error.message);
    res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', authRateLimit, async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  if (!isEmailConfigured()) {
    res.status(501).json({ error: 'Email service is not configured' });
    return;
  }

  try {
    const sql = requireDB();

    // Always return success to prevent email enumeration
    const result = await sql`
      SELECT id, email, display_name, password_hash FROM users WHERE email = ${email.toLowerCase()}
    `;

    if (result.length > 0 && result[0].password_hash) {
      // Only send reset for password accounts (not OAuth-only)
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await sql`
        UPDATE users
        SET password_reset_token = ${resetToken},
            password_reset_expires = ${resetExpires.toISOString()}
        WHERE id = ${result[0].id}
      `;

      await sendPasswordResetEmail(result[0].email, resetToken, getFrontendUrl(req), result[0].display_name);
    }

    // Always return success to prevent email enumeration
    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error: any) {
    console.error('Forgot password error:', error.message);
    res.status(500).json({ error: 'Failed to process request. Please try again.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', authRateLimit, async (req, res) => {
  const { token, password } = req.body;

  if (!token || typeof token !== 'string') {
    res.status(400).json({ error: 'Reset token is required' });
    return;
  }

  if (!password || password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    res.status(400).json({ error: 'Password must contain at least one letter and one number' });
    return;
  }

  try {
    const sql = requireDB();

    // Verify token and check expiry
    const result = await sql`
      SELECT id, email, plan FROM users
      WHERE password_reset_token = ${token}
        AND password_reset_expires > NOW()
    `;

    if (result.length === 0) {
      res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
      return;
    }

    const user = result[0];
    const passwordHash = await bcrypt.hash(password, 12);

    // Update password and clear reset token
    await sql`
      UPDATE users
      SET password_hash = ${passwordHash},
          password_reset_token = NULL,
          password_reset_expires = NULL
      WHERE id = ${user.id}
    `;

    const jwtToken = generateToken({ id: user.id, email: user.email, plan: user.plan });

    res.json({ message: 'Password reset successfully', token: jwtToken });
  } catch (error: any) {
    console.error('Reset password error:', error.message);
    res.status(500).json({ error: 'Password reset failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', authRateLimit, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const sql = requireDB();

    const result = await sql`
      SELECT id, email, password_hash, display_name, plan, email_verified
      FROM users
      WHERE email = ${email.toLowerCase()}
    `;

    if (result.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = result[0];

    // OAuth-only accounts have no password — cannot use email/password login
    if (!user.password_hash) {
      res.status(401).json({ error: 'This account uses Google or GitHub sign-in. Please use the appropriate sign-in button.' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = generateToken({ id: user.id, email: user.email, plan: user.plan });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        plan: user.plan,
        emailVerified: user.email_verified,
      },
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const sql = requireDB();
    const result = await sql`
      SELECT id, email, display_name, plan, email_verified, stripe_customer_id,
             subscription_status, subscription_period_end, storage_used_bytes, created_at
      FROM users WHERE id = ${req.user!.id}
    `;

    if (result.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result[0];

    // If the plan in DB differs from the JWT claim (e.g. after Stripe upgrade),
    // issue a fresh JWT so the client uses the correct plan going forward.
    const currentJwtPlan = req.user!.plan;
    const freshToken = user.plan !== currentJwtPlan
      ? generateToken({ id: user.id, email: user.email, plan: user.plan })
      : undefined;

    res.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      plan: user.plan,
      emailVerified: user.email_verified,
      subscriptionStatus: user.subscription_status,
      subscriptionPeriodEnd: user.subscription_period_end,
      storageUsedBytes: user.storage_used_bytes,
      createdAt: user.created_at,
      ...(freshToken ? { token: freshToken } : {}),
    });
  } catch (error: any) {
    console.error('Get user error:', error.message);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

export default router;
