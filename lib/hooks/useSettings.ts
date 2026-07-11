'use client';

import { useCallback } from 'react';
import { mutate as globalMutate } from 'swr';
import { useAdminAuth } from '@/lib/admin/auth-context';
import { useAdminSWR } from '@/lib/admin/use-admin-swr';
import { adminMutate } from '@/lib/admin/api-client';

const KEY = '/api/settings';

/** dp_settings es un key/value plano — identidad del salón, ventana de reservas, plantillas de WhatsApp, etc. */
export function useSettings() {
  const { secret } = useAdminAuth();
  const { data, error, isLoading } = useAdminSWR<{ settings: Record<string, string> }>(KEY);

  const refresh = useCallback(() => globalMutate(KEY), []);

  const save = useCallback(
    async (values: Record<string, string>) => {
      await adminMutate(KEY, 'PATCH', values, secret);
      await refresh();
    },
    [secret, refresh]
  );

  return { settings: data?.settings ?? {}, isLoading, error, refresh, save };
}
