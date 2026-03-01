import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { auth as authApi, getToken, setToken, clearToken } from './api';

interface User {
  id: string;
  email: string;
  displayName: string | null;
  plan: string;
  emailVerified?: boolean;
  subscriptionStatus?: string;
  subscriptionPeriodEnd?: string;
  storageUsedBytes?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  oauthError: string | null;
  pendingAction: PendingAction | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  clearOAuthError: () => void;
  clearPendingAction: () => void;
}

type PendingAction =
  | { type: 'verify'; token: string }
  | { type: 'reset'; token: string }
  | { type: 'invite'; token: string };

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Extract a parameter from the URL hash fragment.
 * E.g. "#token=abc&foo=bar" -> extractHashParam('token') returns 'abc'
 */
function extractHashParam(name: string): string | null {
  const hash = window.location.hash;
  if (!hash || hash.length < 2) return null;

  const params = new URLSearchParams(hash.substring(1));
  return params.get(name);
}

/**
 * Remove all auth-related params from the URL hash without triggering a page reload.
 */
function cleanHash() {
  // Remove the hash entirely by pushing a clean URL
  const url = window.location.pathname + window.location.search;
  window.history.replaceState(null, '', url);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const clearOAuthError = useCallback(() => setOauthError(null), []);
  const clearPendingAction = useCallback(() => setPendingAction(null), []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await authApi.me();
      // If the server issued a fresh JWT (e.g. plan changed after Stripe upgrade),
      // save it so subsequent requests (including WebSocket) use the correct plan.
      if (data.token) {
        setToken(data.token);
      }
      setUser(data);
    } catch {
      setUser(null);
      clearToken();
    }
  }, []);

  useEffect(() => {
    // Check for OAuth token in URL hash (from OAuth redirect)
    const hashToken = extractHashParam('token');
    const hashError = extractHashParam('auth_error');
    const verifyToken = extractHashParam('verify');
    const resetToken = extractHashParam('reset');
    const inviteToken = extractHashParam('invite');

    if (hashToken) {
      // OAuth login succeeded — save the token, fetch user, clean URL
      setToken(hashToken);
      cleanHash();
      refreshUser().finally(() => setLoading(false));
      return;
    }

    if (hashError) {
      // OAuth login failed — show error, clean URL
      setOauthError(decodeURIComponent(hashError));
      cleanHash();
      setLoading(false);
      return;
    }

    // Email verification link
    if (verifyToken) {
      cleanHash();
      setPendingAction({ type: 'verify', token: verifyToken });
    }

    // Password reset link
    if (resetToken) {
      cleanHash();
      setPendingAction({ type: 'reset', token: resetToken });
    }

    // Collaboration invite link
    if (inviteToken) {
      cleanHash();
      setPendingAction({ type: 'invite', token: inviteToken });
    }

    // Normal flow — check for existing stored token
    const token = getToken();
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    const handleLogout = () => {
      setUser(null);
    };
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (email: string, password: string, displayName?: string) => {
    const data = await authApi.register(email, password, displayName);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated: !!user,
      oauthError,
      pendingAction,
      login,
      register,
      logout,
      refreshUser,
      clearOAuthError,
      clearPendingAction,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
