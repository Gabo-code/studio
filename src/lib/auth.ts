import { COORDINATOR_PASSWORD, ADMIN_PASSWORD, AUTH_TOKEN_KEY } from './constants';

export type UserRole = 'coordinator' | 'admin';

// Milisegundos para 10 minutos (10 * 60 * 1000) - Cambiado de 24 horas para pruebas
const SESSION_EXPIRY_TIME = 600000;

export function login(password: string, role: UserRole): boolean {
  let isValid = false;
  if (role === 'coordinator' && password === COORDINATOR_PASSWORD) {
    isValid = true;
  } else if (role === 'admin' && password === ADMIN_PASSWORD) {
    isValid = true;
  }

  if (isValid && typeof window !== 'undefined') {
    // Guardar token con marca de tiempo para validar expiración de 24 horas
    localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify({ 
      role, 
      loggedInAt: Date.now(),
      expiresAt: Date.now() + SESSION_EXPIRY_TIME
    }));
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
      const currentTime = Date.now();
      
      // Verificar si el token ha expirado (24 horas desde la creación)
      if (parsedToken.expiresAt && currentTime < parsedToken.expiresAt) {
        return { isAuthenticated: true, role: parsedToken.role };
      } else {
        // Si el token expiró, eliminarlo y devolver no autenticado
        logout();
        return { isAuthenticated: false, role: null };
      }
    } catch (e) {
      logout(); // Eliminar token inválido
      return { isAuthenticated: false, role: null };
    }
  }
  return { isAuthenticated: false, role: null };
}

// Función para extender la sesión actual por 24 horas más
export function extendSession(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    try {
      const parsedToken = JSON.parse(token);
      
      // Actualizar la fecha de expiración a 24 horas desde ahora
      parsedToken.expiresAt = Date.now() + SESSION_EXPIRY_TIME;
      
      localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(parsedToken));
      return true;
    } catch (e) {
      return false;
    }
  }
  return false;
}
