'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

function RegistrarContent() {
  const router = useRouter();
  const params = useSearchParams();
  const prefill = params.get('phone') ?? '';

  const [name, setName]   = useState('');
  const [phone, setPhone] = useState(prefill);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async () => {
    setError('');
    const phoneClean = phone.replace(/\D/g, '');
    if (!name.trim()) { setError('Escribe tu nombre'); return; }
    if (phoneClean.length < 10) { setError('Teléfono de 10 dígitos'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/loyalty/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phoneClean }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al registrar'); return; }
      router.replace(`/tarjeta/${data.token}`);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: 'linear-gradient(160deg, #16181E 0%, #1e1a17 100%)' }}
    >
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-[9px] tracking-[0.35em] uppercase text-[#81807F] mb-3">
            Daniela Palacio Hair Room
          </p>
          <h1
            className="text-3xl font-light text-[#F0EDE8] leading-snug"
            style={{ fontFamily: 'var(--font-display, serif)' }}
          >
            Tu tarjeta<br />de clienta
          </h1>
          <p className="mt-3 text-[#81807F] text-xs tracking-wider">
            10 visitas = tratamiento de regalo
          </p>
        </div>

        {/* Form */}
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Tu nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-transparent border border-white/15 text-[#F0EDE8] placeholder:text-[#444] px-4 py-3 text-sm focus:outline-none focus:border-[#81807F]/60"
            style={{ fontSize: '16px' }}
            autoComplete="name"
          />
          <input
            type="tel"
            placeholder="WhatsApp (10 dígitos)"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            className="w-full bg-transparent border border-white/15 text-[#F0EDE8] placeholder:text-[#444] px-4 py-3 text-sm focus:outline-none focus:border-[#81807F]/60"
            style={{ fontSize: '16px' }}
            autoComplete="tel"
          />

          {error && (
            <p className="text-red-400 text-xs tracking-wider text-center">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving || !name.trim() || phone.length < 10}
            className="w-full flex items-center justify-center gap-2 bg-[#F0EDE8] text-[#16181E] py-3.5 text-[11px] tracking-[0.25em] uppercase font-semibold hover:bg-[#E0DBD4] transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-[#16181E] border-t-transparent rounded-full animate-spin" />
            ) : (
              <><span>Obtener mi tarjeta</span><ArrowRight size={13} /></>
            )}
          </button>
        </div>

        <p className="text-center text-[10px] text-[#444] mt-6 tracking-wider">
          Al registrarte aceptas recibir recordatorios por WhatsApp
        </p>
      </div>
    </div>
  );
}

export default function RegistrarPage() {
  return <Suspense><RegistrarContent /></Suspense>;
}
