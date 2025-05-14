import { PERSISTENT_ID_KEY } from './constants';

export function generatePersistentId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function getPersistentId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PERSISTENT_ID_KEY);
}

export function setPersistentId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PERSISTENT_ID_KEY, id);
}

export function ensurePersistentId(): string {
  let pid = getPersistentId();
  if (!pid) {
    pid = generatePersistentId();
    setPersistentId(pid);
  }
  return pid;
}
