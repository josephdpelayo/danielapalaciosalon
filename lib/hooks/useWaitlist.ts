'use client';

import { useCallback, useState } from 'react';
import { mutate as globalMutate } from 'swr';
import { useAdminAuth } from '@/lib/admin/auth-context';
import { useAdminSWR } from '@/lib/admin/use-admin-swr';
import { adminMutate } from '@/lib/admin/api-client';
import type { Appointment, WaitlistEntry } from '@/lib/types';

export function useWaitlist(status: WaitlistEntry['status'] = 'waiting') {
  const { secret } = useAdminAuth();
  const [currentStatus, setCurrentStatus] = useState(status);
  const key = `/api/waitlist?status=${currentStatus}`;
  const { data, error, isLoading } = useAdminSWR<{ entries: WaitlistEntry[] }>(key);

  const refresh = useCallback(() => globalMutate(key), [key]);

  const setStatus = useCallback(
    async (id: string, newStatus: WaitlistEntry['status']) => {
      await adminMutate('/api/waitlist', 'PATCH', { id, status: newStatus }, secret);
      await refresh();
    },
    [secret, refresh]
  );

  /** Crea la cita real desde una entrada de lista de espera y la marca 'booked'. */
  const promote = useCallback(
    async (id: string, input: { appointment_date: string; start_time: string; end_time: string; staff_id?: string }) => {
      const appointment = await adminMutate<Appointment>('/api/waitlist/promote', 'POST', { id, ...input }, secret);
      await refresh();
      await globalMutate('/api/appointments');
      return appointment;
    },
    [secret, refresh]
  );

  return {
    entries: data?.entries ?? [],
    status: currentStatus,
    setStatusFilter: setCurrentStatus,
    isLoading,
    error,
    refresh,
    setStatus,
    promote,
  };
}
