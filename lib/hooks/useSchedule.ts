'use client';

import { useCallback } from 'react';
import { mutate as globalMutate } from 'swr';
import { useAdminAuth } from '@/lib/admin/auth-context';
import { useAdminSWR } from '@/lib/admin/use-admin-swr';
import { adminMutate } from '@/lib/admin/api-client';
import type { ScheduleConfig } from '@/lib/types';

const KEY = '/api/schedule';

/** Horario global del salón (dp_schedule) — Agenda y Config leen de aquí, nunca de MOCK_SCHEDULE. */
export function useSchedule() {
  const { secret } = useAdminAuth();
  const { data, error, isLoading } = useAdminSWR<{ schedule: ScheduleConfig[] }>(KEY);

  const refresh = useCallback(() => globalMutate(KEY), []);

  const updateDay = useCallback(
    async (day: Omit<ScheduleConfig, 'id'> & { day_of_week: number }) => {
      await adminMutate(KEY, 'PATCH', day, secret);
      await refresh();
    },
    [secret, refresh]
  );

  return { schedule: data?.schedule ?? [], isLoading, error, refresh, updateDay };
}
