const API_BASE = import.meta.env.VITE_API_URL || '';

const TOKEN_KEY = 'mathflow-auth-token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearToken();
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }

  // Guard against non-JSON responses (e.g., HTML error pages from proxy/Express default handler)
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    const isHtml = text.trimStart().startsWith('<');
    const error = new Error(
      isHtml
        ? `Server returned HTML instead of JSON (status ${response.status}). The API server may not be running or the request was routed to the wrong server.`
        : `Unexpected response (status ${response.status}): ${text.slice(0, 200)}`
    );
    (error as any).status = response.status;
    throw error;
  }

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || 'Request failed');
    (error as any).status = response.status;
    (error as any).data = data;
    throw error;
  }
  return data;
}

// Auth
export const auth = {
  register: (email: string, password: string, displayName?: string) =>
    request<{ user: any; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    }),

  login: (email: string, password: string) =>
    request<{ user: any; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<any>('/api/auth/me'),

  verifyEmail: (token: string) =>
    request<{ message: string; token: string }>('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  resendVerification: () =>
    request<{ message: string }>('/api/auth/resend-verification', {
      method: 'POST',
    }),

  forgotPassword: (email: string) =>
    request<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    request<{ message: string; token: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
};

// Notebooks
export const notebooks = {
  list: () => request<any[]>('/api/notebooks'),

  create: (title?: string) =>
    request<any>('/api/notebooks', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),

  rename: (id: string, title: string) =>
    request<any>(`/api/notebooks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title }),
    }),

  delete: (id: string) =>
    request<any>(`/api/notebooks/${id}`, { method: 'DELETE' }),
};

// Notes
export const notes = {
  list: (notebookId: string) =>
    request<any[]>(`/api/notes?notebookId=${notebookId}`),

  get: (id: string) => request<any>(`/api/notes/${id}`),

  getPublic: (slug: string) => request<any>(`/api/notes/public/${slug}`),

  create: (notebookId: string, title?: string) =>
    request<any>('/api/notes', {
      method: 'POST',
      body: JSON.stringify({ notebookId, title }),
    }),

  update: (id: string, data: { title?: string; content?: any }) =>
    request<any>(`/api/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<any>(`/api/notes/${id}`, { method: 'DELETE' }),

  search: (q: string) =>
    request<any[]>(`/api/notes/search?q=${encodeURIComponent(q)}`),
};
