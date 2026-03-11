import { api, setToken, clearToken } from './api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'oenologue' | 'operator' | 'viewer';
  cellar_name?: string;
}

export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  const result = await api<{ token: string; user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(result.token);
  localStorage.setItem('barbote_user', JSON.stringify(result.user));
  return result;
}

export function logout(): void {
  clearToken();
  window.location.href = '/login';
}

export function getCurrentUser(): User | null {
  const stored = localStorage.getItem('barbote_user');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('barbote_token');
}
