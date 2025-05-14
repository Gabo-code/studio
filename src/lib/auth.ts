import { COORDINATOR_PASSWORD, ADMIN_PASSWORD, AUTH_TOKEN_KEY } from './constants';

export type UserRole = 'coordinator' | 'admin';

export function login(password: string, role: UserRole): boolean {
  let isValid = false;
  if (role === 'coordinator' && password === COORDINATOR_PASSWORD) {
    isValid = true;
  } else if (role === 'admin' && password === ADMIN_PASSWORD) {
    isValid = true;
  }

  if (isValid && typeof window !== 'undefined') {
    localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify({ role, loggedInAt: Date.now() }));
  }
  return isValid;
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export function getAuthStatus(): { isAuthenticated: boolean; role: UserRole | null } {
  if (typeof window === 'undefined') {
    return { isAuthenticated: false, role: null };
  }
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    try {
      const parsedToken = JSON.parse(token);
      // Optional: Add token expiration check here
      return { isAuthenticated: true, role: parsedToken.role };
    } catch (e) {
      logout(); // Clear invalid token
      return { isAuthenticated: false, role: null };
    }
  }
  return { isAuthenticated: false, role: null };
}
