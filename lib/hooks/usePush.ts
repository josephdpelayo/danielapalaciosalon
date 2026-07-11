'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminAuth } from '@/lib/admin/auth-context';

function urlBase64ToUint8Array(b64: string): Uint8Array {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** Wrapper de la lógica de suscripción push, antes inline en app/admin/page.tsx. */
export function usePush() {
  const { secret } = useAdminAuth();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => reg.pushManager.getSubscription().then((sub) => { if (sub) setEnabled(true); }))
      .catch(() => {});
  }, []);

  const register = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
      if (Notification.permission === 'denied') return false;
      const reg = await navigator.serviceWorker.register('/sw.js');
      const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      if (perm !== 'granted') return false;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return false;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as Uint8Array<ArrayBuffer>,
      });
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify(sub),
      });
      setEnabled(true);
      return true;
    } finally {
      setLoading(false);
    }
  }, [secret]);

  const unregister = useCallback(async (): Promise<void> => {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.register('/sw.js');
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
    }
    setEnabled(false);
  }, [secret]);

  return { enabled, loading, register, unregister };
}
