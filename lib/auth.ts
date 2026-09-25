export interface AuthUser {
  username: string;
  email: string;
  token?: string;
  loginTime: string;
}

const AUTH_STORAGE_KEY = 'leads_approval_auth_user';

export function getAuthUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const item = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!item) return null;
    return JSON.parse(item) as AuthUser;
  } catch (e) {
    console.error('Failed to parse auth user from storage:', e);
    return null;
  }
}

export function setAuthUser(user: AuthUser, rememberMe = true): void {
  if (typeof window === 'undefined') return;
  const userJson = JSON.stringify(user);
  if (rememberMe) {
    localStorage.setItem(AUTH_STORAGE_KEY, userJson);
  } else {
    sessionStorage.setItem(AUTH_STORAGE_KEY, userJson);
  }
}

export function clearAuthUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

export async function verifyAuthUser(): Promise<AuthUser | null> {
  const user = getAuthUser();
  if (!user || !user.token) {
    clearAuthUser();
    return null;
  }

  try {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: user.username,
        email: user.email,
        token: user.token,
      }),
    });

    if (!res.ok) {
      clearAuthUser();
      return null;
    }

    const data = await res.json().catch(() => ({}));
    if (!data.valid) {
      clearAuthUser();
      return null;
    }

    return user;
  } catch (err) {
    console.error('Session verification error:', err);
    clearAuthUser();
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getAuthUser() !== null;
}
