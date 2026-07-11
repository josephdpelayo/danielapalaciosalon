'use client';

import { useCallback } from 'react';
import { mutate as globalMutate } from 'swr';
import { useAdminAuth } from '@/lib/admin/auth-context';
import { useAdminSWR } from '@/lib/admin/use-admin-swr';
import { adminMutate } from '@/lib/admin/api-client';
import type { Service } from '@/lib/types';

const KEY = '/api/services';

interface ServiceInput {
  name: string;
  description?: string | null;
  price: number;
  duration_minutes: number;
  active_minutes: number;
  deposit_amount?: number;
  category?: string;
}

export function useServices() {
  const { secret } = useAdminAuth();
  const { data, error, isLoading } = useAdminSWR<{ services: Service[] }>(KEY);

  const refresh = useCallback(() => globalMutate(KEY), []);

  const create = useCallback(
    async (input: ServiceInput) => {
      const created = await adminMutate<Service>(KEY, 'POST', input, secret);
      await refresh();
      return created;
    },
    [secret, refresh]
  );

  const update = useCallback(
    async (id: string, fields: Partial<ServiceInput> & { active?: boolean; sort_order?: number }) => {
      const updated = await adminMutate<Service>(KEY, 'PATCH', { id, ...fields }, secret);
      await refresh();
      return updated;
    },
    [secret, refresh]
  );

  /** Soft-delete: el backend solo desactiva (active=false), no borra. */
  const deactivate = useCallback(
    async (id: string) => {
      await adminMutate(KEY, 'DELETE', { id }, secret);
      await refresh();
    },
    [secret, refresh]
  );

  /** Reordena escribiendo sort_order por fila movida (no existe endpoint de bulk-reorder). */
  const reorder = useCallback(
    async (orderedIds: string[]) => {
      await Promise.all(orderedIds.map((id, index) => adminMutate(KEY, 'PATCH', { id, sort_order: index }, secret)));
      await refresh();
    },
    [secret, refresh]
  );

  return {
    services: data?.services ?? [],
    isLoading,
    error,
    refresh,
    create,
    update,
    deactivate,
    reorder,
  };
}
