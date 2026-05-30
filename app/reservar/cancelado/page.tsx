'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function CanceladoContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#000000' }}>
      <div className="mb-10">
        <svg
          width="96"
          height="96"
          viewBox="0 0 96 96"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="48" cy="48" r="46" stroke="rgba(239,68,68,0.5)" strokeWidth="1.5" />
          <line x1="34" y1="34" x2="62" y2="62" stroke="rgba(239,68,68,0.7)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="62" y1="34" x2="34" y2="62" stroke="rgba(239,68,68,0.7)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      <h1 className="font-[family-name:var(--font-display)] text-4xl text-[#F5F0E8] mb-4">
        Pago no completado
      </h1>

      <p className="text-[#7A7168] text-sm max-w-sm leading-relaxed mb-4">
        No se realizó ningún cargo. Tu reserva no fue confirmada. Puedes intentarlo de nuevo o contactarnos por WhatsApp.
      </p>

      {id && (
        <p className="text-[#3A3632] text-xs mb-10">
          Referencia: #{id.toString().slice(-8).toUpperCase()}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href={`https://wa.me/${process.env.NEXT_PUBLIC_SALON_WHATSAPP ?? '526691459296'}`}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-[#2A2620] text-[#7A7168] px-6 py-3 text-xs tracking-[0.2em] uppercase hover:border-[#81807F] hover:text-[#81807F] transition-colors"
        >
          Contactar por WhatsApp
        </a>
        <Link href="/reservar" className="bg-[#F0EDE8] text-[#16181E] px-6 py-3 text-xs tracking-[0.2em] uppercase font-semibold hover:bg-[#A09F9E] transition-colors">
          Intentar de nuevo
        </Link>
      </div>
    </div>
  );
}

export default function CanceladoPage() {
  return <Suspense><CanceladoContent /></Suspense>;
}
