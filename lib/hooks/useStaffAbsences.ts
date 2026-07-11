'use client';

import { useCallback } from 'react';
import { mutate as globalMutate } from 'swr';
import { useAdminAuth } from '@/lib/admin/auth-context';
import { useAdminSWR } from '@/lib/admin/use-admin-swr';
import { adminMutate } from '@/lib/admin/api-client';
import type { StaffAbsence } from '@/lib/types';

/** Ausencias de un staff específico. `end_date` en addRange permite marcar un rango completo. */
export function useStaffAbsences(staffId: string | null) {
  const { secret } = useAdminAuth();
  const key = staffId ? `/api/staff-absences?staff_id=${staffId}` : null;
  const { data, error, isLoading } = useAdminSWR<{ absences: StaffAbsence[] }>(key);

  const refresh = useCallback(() => (key ? globalMutate(key) : Promise.resolve()), [key]);

  const addRange = useCallback(
    async (absenceDate: string, endDate?: string) => {
      if (!staffId) return { created: 0, conflicts: [] as { date: string; count: number }[] };
      const result = await adminMutate<{ created?: number; conflicts?: { date: string; count: number }[]; absence?: StaffAbsence; conflict?: boolean; count?: number; error?: string }>(
        '/api/staff-absences',
        'POST',
        { staff_id: staffId, absence_date: absenceDate, end_date: endDate },
        secret
      );
      await refresh();
      return { created: result.created ?? (result.absence ? 1 : 0), conflicts: result.conflicts ?? [] };
    },
    [staffId, secret, refresh]
  );

  const remove = useCallback(
    async (absenceDate: string) => {
      if (!staffId) return;
      await adminMutate('/api/staff-absences', 'DELETE', { staff_id: staffId, absence_date: absenceDate }, secret);
      await refresh();
    },
    [staffId, secret, refresh]
  );

  return {
    absences: data?.absences ?? [],
    isLoading,
    error,
    refresh,
    addRange,
    remove,
  };
}
