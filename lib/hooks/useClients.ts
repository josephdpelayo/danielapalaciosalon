'use client';

import { useCallback, useState } from 'react';
import { mutate as globalMutate } from 'swr';
import { useAdminAuth } from '@/lib/admin/auth-context';
import { useAdminSWR } from '@/lib/admin/use-admin-swr';
import { adminGet, adminMutate } from '@/lib/admin/api-client';
import type { AdminClient, TrustedClient } from '@/lib/types';

interface ClientsResponse {
  clients: AdminClient[];
  total: number;
  page: number;
  pageSize: number;
}

/** Lista unificada de clientes (merge server-side en /api/admin/clients) con búsqueda + paginación. */
export function useClients(pageSize = 20) {
  const { secret } = useAdminAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search) params.set('search', search);
  const key = `/api/admin/clients?${params.toString()}`;

  const { data, error, isLoading } = useAdminSWR<ClientsResponse>(key);

  const refresh = useCallback(() => globalMutate(key), [key]);

  const updateSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const update = useCallback(
    async (phoneNormalized: string, fields: { name?: string; email?: string | null }) => {
      await adminMutate('/api/clients', 'PATCH', { phone_normalized: phoneNormalized, ...fields }, secret);
      await refresh();
    },
    [secret, refresh]
  );

  const remove = useCallback(
    async (phoneNormalized: string) => {
      // Cascade: citas -> cliente -> confianza (mismo orden que hoy).
      // /api/trusted-clients solo borra por id propio, así que primero lo buscamos por teléfono.
      await adminMutate('/api/appointments', 'DELETE', { phone_normalized: phoneNormalized }, secret);
      await adminMutate('/api/clients', 'DELETE', { phone_normalized: phoneNormalized }, secret);
      try {
        const trusted = await adminGet<{ clients: TrustedClient[] }>('/api/trusted-clients', secret);
        const match = trusted.clients?.find((c) => c.phone_normalized === phoneNormalized);
        if (match) await adminMutate('/api/trusted-clients', 'DELETE', { id: match.id }, secret);
      } catch {
        // No crítico: si no se encuentra o falla, la fila queda huérfana pero el cliente ya se borró.
      }
      await refresh();
    },
    [secret, refresh]
  );

  const stampLoyalty = useCallback(
    async (phone: string) => {
      const result = await adminMutate<{ visit_count: number }>('/api/loyalty/stamp', 'POST', { phone }, secret);
      await refresh();
      return result;
    },
    [secret, refresh]
  );

  const unstampLoyalty = useCallback(
    async (phone: string) => {
      const result = await adminMutate<{ visit_count: number }>('/api/loyalty/stamp', 'DELETE', { phone }, secret);
      await refresh();
      return result;
    },
    [secret, refresh]
  );

  return {
    clients: data?.clients ?? [],
    total: data?.total ?? 0,
    page,
    pageSize,
    setPage,
    search,
    setSearch: updateSearch,
    isLoading,
    error,
    refresh,
    update,
    remove,
    stampLoyalty,
    unstampLoyalty,
  };
}
