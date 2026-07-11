'use client';

import { useCallback } from 'react';
import { mutate as globalMutate } from 'swr';
import { useAdminAuth } from '@/lib/admin/auth-context';
import { useAdminSWR } from '@/lib/admin/use-admin-swr';
import { adminMutate } from '@/lib/admin/api-client';
import type { BlockedSlot } from '@/lib/types';

const KEY = '/api/blocked-slots';

export function useBlockedSlots() {
  const { secret } = useAdminAuth();
  const { data, error, isLoading } = useAdminSWR<{ blocks: BlockedSlot[] }>(KEY);

  const refresh = useCallback(() => globalMutate(KEY), []);

  const create = useCallback(
    async (input: { block_date: string; start_time?: string | null; end_time?: string | null; reason?: string | null; all_day?: boolean }) => {
      const created = await adminMutate<BlockedSlot>(KEY, 'POST', input, secret);
      await refresh();
      return created;
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

  return { blockedSlots: data?.blocks ?? [], isLoading, error, refresh, create, remove };
}
