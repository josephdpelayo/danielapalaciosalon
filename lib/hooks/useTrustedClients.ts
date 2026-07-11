'use client';

import { useCallback } from 'react';
import { mutate as globalMutate } from 'swr';
import { useAdminAuth } from '@/lib/admin/auth-context';
import { useAdminSWR } from '@/lib/admin/use-admin-swr';
import { adminMutate } from '@/lib/admin/api-client';
import type { TrustedClient } from '@/lib/types';

const KEY = '/api/trusted-clients';

interface TrustedClientInput {
  name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
}

/** Marcar/editar clientes de confianza ("frecuentes") — lectura general va por useClients(). */
export function useTrustedClients() {
  const { secret } = useAdminAuth();
  const { data, error, isLoading } = useAdminSWR<{ clients: TrustedClient[] }>(KEY);

  const refresh = useCallback(() => globalMutate(KEY), []);

  const create = useCallback(
    async (input: TrustedClientInput) => {
      const created = await adminMutate<TrustedClient>(KEY, 'POST', input, secret);
      await refresh();
      return created;
    },
    [secret, refresh]
  );

  const update = useCallback(
    async (id: string, input: TrustedClientInput) => {
      const updated = await adminMutate<TrustedClient>(KEY, 'PUT', { id, ...input }, secret);
      await refresh();
      return updated;
    },
    [secret, refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      await adminMutate(KEY, 'DELETE', { id }, secret);
      await refresh();
    },
    [secret, refresh]
  );

  return { trustedClients: data?.clients ?? [], isLoading, error, refresh, create, update, remove };
}
