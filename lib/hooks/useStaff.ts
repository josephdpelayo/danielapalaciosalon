'use client';

import { useCallback } from 'react';
import { mutate as globalMutate } from 'swr';
import { useAdminAuth } from '@/lib/admin/auth-context';
import { useAdminSWR } from '@/lib/admin/use-admin-swr';
import { adminMutate } from '@/lib/admin/api-client';
import type { StaffWithDetails, ScheduleConfig } from '@/lib/types';

const KEY = '/api/staff';

export function useStaff() {
  const { secret } = useAdminAuth();
  const { data, error, isLoading } = useAdminSWR<{ staff: StaffWithDetails[] }>(KEY);

  const refresh = useCallback(() => globalMutate(KEY), []);

  const create = useCallback(
    async (input: { name: string; phone?: string | null }) => {
      const created = await adminMutate<{ staff: StaffWithDetails }>(KEY, 'POST', input, secret);
      await refresh();
      return created.staff;
    },
    [secret, refresh]
  );

  const update = useCallback(
    async (id: string, fields: { name?: string; is_active?: boolean; phone?: string | null }) => {
      await adminMutate(KEY, 'PATCH', { id, ...fields }, secret);
      await refresh();
    },
    [secret, refresh]
  );

  const updateSchedule = useCallback(
    async (id: string, schedule: Omit<ScheduleConfig, 'id'>[]) => {
      await adminMutate(KEY, 'PATCH', { id, schedule }, secret);
      await refresh();
    },
    [secret, refresh]
  );

  const updateServices = useCallback(
    async (id: string, serviceIds: string[]) => {
      await adminMutate(KEY, 'PATCH', { id, service_ids: serviceIds }, secret);
      await refresh();
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

  return {
    staff: data?.staff ?? [],
    isLoading,
    error,
    refresh,
    create,
    update,
    updateSchedule,
    updateServices,
    remove,
  };
}
