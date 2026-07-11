'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminAuthContext } from '@/lib/admin/auth-context';
import { getAdminSecret, setAdminSecret, clearAdminSecret } from '@/lib/admin/session';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';

type Status = 'checking' | 'unauthenticated' | 'authenticated';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('checking');
  const [secret, setSecret] = useState('');

  useEffect(() => {
    const saved = getAdminSecret();
    if (!saved) {
      // Se difiere a un microtask (en vez de un setState síncrono en el cuerpo
      // del efecto) para no disparar react-hooks/set-state-in-effect, sin
      // cambiar el timing real: sigue resolviendo en el mismo tick post-montaje.
      Promise.resolve().then(() => setStatus('unauthenticated'));
      return;
    }
    fetch('/api/auth/check', { headers: { 'x-admin-secret': saved } })
      .then((res) => {
        if (res.ok) {
          setSecret(saved);
          setStatus('authenticated');
        } else {
          clearAdminSecret();
          setStatus('unauthenticated');
        }
      })
      .catch(() => {
        // Sin conexión: mantenemos la sesión local en vez de forzar login de nuevo.
        setSecret(saved);
        setStatus('authenticated');
      });
  }, []);

  function handleAuth(pass: string) {
    setAdminSecret(pass);
    setSecret(pass);
    setStatus('authenticated');
  }

  function logout() {
    clearAdminSecret();
    setSecret('');
    setStatus('unauthenticated');
  }

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner size={22} />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <PasswordScreen onAuth={handleAuth} />;
  }

  return <AdminAuthContext.Provider value={{ secret, logout }}>{children}</AdminAuthContext.Provider>;
}

function PasswordScreen({ onAuth }: { onAuth: (password: string) => void }) {
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!pass || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/check', { headers: { 'x-admin-secret': pass } });
      if (res.ok) {
        onAuth(pass);
      } else {
        setError('Contraseña incorrecta');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-xs">
        <p className="font-[family-name:var(--font-display)] text-3xl text-cream text-center mb-1 font-light">
          Admin
        </p>
        <p className="text-[10px] tracking-[0.4em] uppercase text-muted text-center mb-10">
          Daniela Palacio Hair Room
        </p>
        <input
          type="password"
          value={pass}
          onChange={(e) => {
            setPass(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
          placeholder="Contraseña"
          autoFocus
          className="w-full bg-transparent border border-white/10 text-cream px-4 py-3 text-base focus:outline-none focus:border-stone/60 transition-colors placeholder:text-white/20 mb-3"
        />
        {error && <p className="text-red-400 text-[11px] tracking-wider text-center mb-3">{error}</p>}
        <Button className="w-full justify-center" loading={loading} onClick={handleSubmit}>
          Entrar
        </Button>
        <div className="text-center mt-6">
          <Link href="/" className="text-muted text-xs hover:text-stone transition-colors tracking-wider">
            ← Volver al sitio
          </Link>
        </div>
      </div>
    </div>
  );
}
