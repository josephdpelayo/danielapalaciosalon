const STORAGE_KEY = 'dp_admin_secret';

export function getAdminSecret(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(STORAGE_KEY);
}

export function setAdminSecret(value: string): void {
  sessionStorage.setItem(STORAGE_KEY, value);
}

export function clearAdminSecret(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
