'use client';

import { useAdminSWR } from '@/lib/admin/use-admin-swr';
import type { AdminStats } from '@/lib/types';

const KEY = '/api/admin/stats';

export function useStats() {
  const { data, error, isLoading } = useAdminSWR<{ stats: AdminStats | null }>(KEY, {
    refreshInterval: 60_000,
  });
  return { stats: data?.stats ?? null, isLoading, error };
}
