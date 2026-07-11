'use client';

import { useCallback, useState } from 'react';
import { useAdminAuth } from '@/lib/admin/auth-context';
import { adminMutate } from '@/lib/admin/api-client';

/** Dispara el envío (generación de links de WhatsApp) de recordatorios de mañana. */
export function useReminders() {
  const { secret } = useAdminAuth();
  const [triggering, setTriggering] = useState(false);

  const trigger = useCallback(async () => {
    setTriggering(true);
    try {
      return await adminMutate<{ sent?: number }>('/api/admin/trigger-reminders', 'POST', undefined, secret);
    } finally {
      setTriggering(false);
    }
  }, [secret]);

  return { trigger, triggering };
}
