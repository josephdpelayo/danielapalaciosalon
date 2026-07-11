'use client';

import { createContext, useContext } from 'react';

export interface AdminAuthValue {
  secret: string;
  logout: () => void;
}

export const AdminAuthContext = createContext<AdminAuthValue | null>(null);

/** Secreto admin + logout, disponible en cualquier componente bajo &lt;AuthGate&gt; sin prop-drilling. */
export function useAdminAuth(): AdminAuthValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth debe usarse dentro de <AuthGate>');
  return ctx;
}
