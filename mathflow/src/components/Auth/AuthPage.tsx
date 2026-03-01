import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { auth as authApi, setToken } from '../../lib/api';
import './AuthPage.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface AuthPageProps {
  onSuccess: () => void;
}

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

export function AuthPage({ onSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerificationBanner, setShowVerificationBanner] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [resetTokenStored, setResetTokenStored] = useState<string | null>(null);
  const { login, register, oauthError, clearOAuthError, pendingAction, clearPendingAction, refreshUser } = useAuth();

  // Show OAuth error from redirect if present
  const displayError = error || oauthError || '';

  // Handle pending actions from URL hash (verify email, reset password, accept invite)
  useEffect(() => {
    if (!pendingAction) return;

    if (pendingAction.type === 'verify') {
      setLoading(true);
      setError('');
      authApi.verifyEmail(pendingAction.token)
        .then((data) => {
          setSuccess('Email verified successfully! You can now sign in.');
          if (data.token) {
            setToken(data.token);
            refreshUser().then(() => onSuccess());
          }
        })
        .catch((err: any) => {
          setError(err.message || 'Email verification failed');
        })
        .finally(() => {
          setLoading(false);
          clearPendingAction();
        });
    }

    if (pendingAction.type === 'reset') {
      setResetTokenStored(pendingAction.token);
      setMode('reset');
      clearPendingAction();
    }
  }, [pendingAction, clearPendingAction, refreshUser, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (oauthError) clearOAuthError();
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        onSuccess();
      } else if (mode === 'register') {
        await register(email, password, displayName || undefined);
        setShowVerificationBanner(true);
        onSuccess();
      } else if (mode === 'forgot') {
        await authApi.forgotPassword(email);
        setSuccess('If an account with that email exists, a password reset link has been sent. Check your inbox.');
      } else if (mode === 'reset') {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        const resetToken = resetTokenStored || extractResetToken();
        if (!resetToken) {
          setError('Invalid reset link. Please request a new one.');
          setLoading(false);
          return;
        }
        const data = await authApi.resetPassword(resetToken, password);
        setSuccess('Password reset successfully!');
        if (data.token) {
          setToken(data.token);
          await refreshUser();
          setTimeout(() => onSuccess(), 1500);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
    setLoading(false);
  };

  const handleResendVerification = async () => {
    setResendingVerification(true);
    try {
      await authApi.resendVerification();
      setSuccess('Verification email sent! Check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email');
    }
    setResendingVerification(false);
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE}/api/auth/google`;
  };

  const handleGitHubLogin = () => {
    window.location.href = `${API_BASE}/api/auth/github`;
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError('');
    setSuccess('');
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>
            <span className="logo-math">Math</span>
            <span className="logo-flow">Flow</span>
          </h1>
          <p>Fast, WYSIWYG math notes with LaTeX export</p>
        </div>

        {/* Verification banner after registration */}
        {showVerificationBanner && (
          <div className="auth-verify-banner">
            <p>A verification email has been sent to <strong>{email}</strong>.</p>
            <p>Please check your inbox and verify your email address.</p>
            <button
              className="auth-resend-btn"
              onClick={handleResendVerification}
              disabled={resendingVerification}
            >
              {resendingVerification ? 'Sending...' : 'Resend verification email'}
            </button>
          </div>
        )}

        {/* Forgot password mode */}
        {mode === 'forgot' && (
          <>
            <div className="auth-mode-header">
              <h2>Reset Password</h2>
              <p>Enter your email and we'll send you a reset link.</p>
            </div>
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.edu"
                  required
                />
              </div>

              {displayError && <div className="auth-error">{displayError}</div>}
              {success && <div className="auth-success">{success}</div>}

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? 'Please wait...' : 'Send Reset Link'}
              </button>
            </form>
            <div className="auth-footer">
              <button className="auth-link-btn" onClick={() => switchMode('login')}>
                Back to Sign In
              </button>
            </div>
          </>
        )}

        {/* Reset password mode (from email link) */}
        {mode === 'reset' && (
          <>
            <div className="auth-mode-header">
              <h2>Set New Password</h2>
              <p>Choose a new password for your account.</p>
            </div>
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label>New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                />
              </div>
              <div className="auth-field">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  minLength={8}
                />
              </div>

              {displayError && <div className="auth-error">{displayError}</div>}
              {success && <div className="auth-success">{success}</div>}

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? 'Please wait...' : 'Reset Password'}
              </button>
            </form>
            <div className="auth-footer">
              <button className="auth-link-btn" onClick={() => switchMode('login')}>
                Back to Sign In
              </button>
            </div>
          </>
        )}

        {/* Login / Register modes */}
        {(mode === 'login' || mode === 'register') && (
          <>
            <div className="auth-tabs">
              <button
                className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                onClick={() => switchMode('login')}
              >
                Sign In
              </button>
              <button
                className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
                onClick={() => switchMode('register')}
              >
                Create Account
              </button>
            </div>

            <div className="auth-oauth-buttons">
              <button
                type="button"
                className="auth-oauth-btn auth-oauth-google"
                onClick={handleGoogleLogin}
              >
                <svg className="auth-oauth-icon" viewBox="0 0 24 24" width="18" height="18">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>
              <button
                type="button"
                className="auth-oauth-btn auth-oauth-github"
                onClick={handleGitHubLogin}
              >
                <svg className="auth-oauth-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                </svg>
                Sign in with GitHub
              </button>
            </div>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {mode === 'register' && (
                <div className="auth-field">
                  <label>Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name (optional)"
                  />
                </div>
              )}

              <div className="auth-field">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.edu"
                  required
                />
              </div>

              <div className="auth-field">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
                  required
                  minLength={mode === 'register' ? 8 : undefined}
                />
              </div>

              {displayError && <div className="auth-error">{displayError}</div>}
              {success && <div className="auth-success">{success}</div>}

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading
                  ? 'Please wait...'
                  : mode === 'login'
                    ? 'Sign In'
                    : 'Create Account'}
              </button>

              {mode === 'login' && (
                <div className="auth-forgot-row">
                  <button
                    type="button"
                    className="auth-link-btn"
                    onClick={() => switchMode('forgot')}
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </form>

            <div className="auth-footer">
              <button
                className="auth-skip"
                onClick={onSuccess}
              >
                Continue without account (local only)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Extract reset token stored from pendingAction or from current hash (fallback) */
function extractResetToken(): string | null {
  const hash = window.location.hash;
  if (!hash || hash.length < 2) return null;
  const params = new URLSearchParams(hash.substring(1));
  return params.get('reset');
}
