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

// Projects
export const projects = {
  list: () => request<any[]>('/api/projects'),

  create: (title?: string) =>
    request<any>('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),

  rename: (id: string, title: string) =>
    request<any>(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title }),
    }),

  delete: (id: string) =>
    request<any>(`/api/projects/${id}`, { method: 'DELETE' }),
};

// Notebooks
export const notebooks = {
  list: (projectId?: string | null) => {
    if (projectId === null) return request<any[]>('/api/notebooks?projectId=null');
    if (projectId) return request<any[]>(`/api/notebooks?projectId=${projectId}`);
    return request<any[]>('/api/notebooks');
  },

  create: (title?: string, projectId?: string | null) =>
    request<any>('/api/notebooks', {
      method: 'POST',
      body: JSON.stringify({ title, projectId: projectId ?? null }),
    }),

  rename: (id: string, title: string) =>
    request<any>(`/api/notebooks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title }),
    }),

  move: (id: string, projectId: string | null) =>
    request<any>(`/api/notebooks/${id}/move`, {
      method: 'POST',
      body: JSON.stringify({ projectId }),
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

  move: (id: string, notebookId: string) =>
    request<any>(`/api/notes/${id}/move`, {
      method: 'POST',
      body: JSON.stringify({ notebookId }),
    }),

  share: (id: string, isPublic: boolean) =>
    request<any>(`/api/notes/${id}/share`, {
      method: 'POST',
      body: JSON.stringify({ isPublic }),
    }),

  saveVersion: (id: string) =>
    request<any>(`/api/notes/${id}/version`, { method: 'POST' }),

  listVersions: (id: string) =>
    request<any[]>(`/api/notes/${id}/versions`),

  getVersion: (noteId: string, versionId: string) =>
    request<any>(`/api/notes/${noteId}/versions/${versionId}`),

  search: (q: string) =>
    request<any[]>(`/api/notes/search?q=${encodeURIComponent(q)}`),

  invite: (id: string, email: string, permission: string) =>
    request<{ message: string }>(`/api/notes/${id}/invite`, {
      method: 'POST',
      body: JSON.stringify({ email, permission }),
    }),

  acceptInvite: (token: string) =>
    request<{ message: string; noteId: string }>('/api/notes/accept-invite', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  listCollaborators: (id: string) =>
    request<{ collaborators: any[]; pendingInvites: any[] }>(`/api/notes/${id}/collaborators`),

  removeCollaborator: (noteId: string, collabId: string) =>
    request<{ success: boolean }>(`/api/notes/${noteId}/collaborators/${collabId}`, {
      method: 'DELETE',
    }),
};

// Profile
export const profile = {
  get: () => request<any>('/api/profile'),

  update: (data: { display_name?: string; bio?: string; username?: string; collab_color?: string }) =>
    request<any>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  changePassword: (current_password: string, new_password: string) =>
    request<{ message: string }>('/api/profile/password', {
      method: 'PUT',
      body: JSON.stringify({ current_password, new_password }),
    }),

  getBillingPortal: () =>
    request<{ url: string }>('/api/profile/billing'),
};

// PDF Export
export const exportApi = {
  pdf: async (html: string, title: string): Promise<Blob> => {
    const token = getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}/api/export/pdf`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ html, title }),
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        throw new Error(data.error || 'PDF export failed');
      }
      throw new Error(`PDF export failed (status ${response.status})`);
    }

    return response.blob();
  },
};

// Billing
export const billing = {
  getPlans: () => request<{ plans: any[] }>('/api/billing/plans'),

  createCheckout: (plan: string, interval: string) =>
    request<{ url: string }>('/api/billing/create-checkout', {
      method: 'POST',
      body: JSON.stringify({ plan, interval }),
    }),

  openPortal: () =>
    request<{ url: string }>('/api/billing/portal', { method: 'POST' }),
};
