'use client';

import { useCallback } from 'react';
import { mutate as globalMutate } from 'swr';
import { useAdminAuth } from '@/lib/admin/auth-context';
import { useAdminSWR } from '@/lib/admin/use-admin-swr';
import { adminMutate } from '@/lib/admin/api-client';
import type { Appointment } from '@/lib/types';

const KEY = '/api/appointments';

interface NewAppointmentInput {
  service_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  client_name: string;
  client_phone: string;
  notes?: string | null;
}

interface EditAppointmentInput {
  id: string;
  appointment_date?: string;
  start_time?: string;
  end_time?: string;
  notes?: string | null;
  service_id?: string;
}

/** Fuente única de citas — usada por Dashboard, Agenda, Clientes y Staff (antes cada uno reconsultaba por su cuenta). */
export function useAppointments() {
  const { secret } = useAdminAuth();
  const { data, error, isLoading } = useAdminSWR<{ appointments: Appointment[] }>(KEY);

  const refresh = useCallback(() => globalMutate(KEY), []);

  const create = useCallback(
    async (input: NewAppointmentInput) => {
      const created = await adminMutate<Appointment>(KEY, 'POST', input, secret);
      await refresh();
      return created;
    },
    [secret, refresh]
  );

  const editDetails = useCallback(
    async (input: EditAppointmentInput) => {
      const updated = await adminMutate<Appointment>(KEY, 'PATCH', input, secret);
      await refresh();
      return updated;
    },
    [secret, refresh]
  );

  const updateStatus = useCallback(
    async (id: string, status: Appointment['status'], extra?: { payment_status?: string; payment_id?: string }) => {
      const updated = await adminMutate<Appointment>('/api/admin', 'PATCH', { id, status, ...extra }, secret);
      await refresh();
      return updated;
    },
    [secret, refresh]
  );

  const markReminderSent = useCallback(
    async (id: string) => {
      await adminMutate(KEY, 'PATCH', { id, reminder_sent_at: new Date().toISOString() }, secret);
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
    appointments: data?.appointments ?? [],
    isLoading,
    error,
    refresh,
    create,
    editDetails,
    updateStatus,
    markReminderSent,
    remove,
  };
}

/** Atajo compartido: confirmar / completar / cancelar — antes duplicado en Inicio y Agenda. */
export function appointmentStatusActions(updateStatus: ReturnType<typeof useAppointments>['updateStatus']) {
  return {
    confirm: (id: string) => updateStatus(id, 'confirmed'),
    complete: (id: string) => updateStatus(id, 'completed'),
    cancel: (id: string) => updateStatus(id, 'cancelled'),
  };
}
