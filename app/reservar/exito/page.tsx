'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check, Calendar } from 'lucide-react';

function ExitoContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const isPending = searchParams.get('pending') === '1';
  const isManual = searchParams.get('manual') === '1';
  const isTrusted = searchParams.get('trusted') === '1';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#0D0D0D' }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 border-2 border-[#C9A84C]"
        style={{ background: 'rgba(201,168,76,0.08)' }}>
        <Check size={36} className="text-[#C9A84C]" />
      </div>

      <h1 className="font-[family-name:var(--font-display)] text-4xl text-[#F5F0E8] mb-4">
        {isPending ? '¡Pago en proceso!' : '¡Cita confirmada!'}
      </h1>

      {isTrusted ? (
        <p className="text-[#7A7168] text-sm max-w-sm leading-relaxed mb-4">
          Tu cita quedó confirmada automáticamente. ¡Gracias por ser clienta frecuente! 🌟 Te esperamos.
        </p>
      ) : isManual ? (
        <p className="text-[#7A7168] text-sm max-w-sm leading-relaxed mb-4">
          Tu solicitud fue recibida. Daniela te contactará por WhatsApp para coordinar el anticipo y confirmar tu cita.
        </p>
      ) : isPending ? (
        <p className="text-[#7A7168] text-sm max-w-sm leading-relaxed mb-4">
          Tu pago está siendo procesado. Cuando MercadoPago lo confirme, tu cita quedará activa automáticamente.
        </p>
      ) : (
        <p className="text-[#7A7168] text-sm max-w-sm leading-relaxed mb-4">
          Tu anticipo fue recibido y tu cita está confirmada. ¡Te esperamos! Daniela te contactará si necesita algo más.
        </p>
      )}

      {id && (
        <p className="text-[#3A3632] text-xs mb-10">
          Referencia: #{id.toString().slice(-8).toUpperCase()}
        </p>
      )}

      <div className="flex items-center gap-2 text-[#7A7168] text-sm mb-10">
        <Calendar size={14} className="text-[#C9A84C]" />
        <span>Agrega la cita a tu calendario para no olvidarla</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/" className="border border-[#2A2620] text-[#7A7168] px-6 py-3 text-xs tracking-[0.2em] uppercase hover:border-[#C9A84C] hover:text-[#C9A84C] transition-colors">
          Volver al inicio
        </Link>
        <Link href="/reservar" className="bg-[#C9A84C] text-[#0D0D0D] px-6 py-3 text-xs tracking-[0.2em] uppercase font-semibold hover:bg-[#E8C97A] transition-colors">
          Nueva cita
        </Link>
      </div>
    </div>
  );
}

export default function ExitoPage() {
  return <Suspense><ExitoContent /></Suspense>;
}
