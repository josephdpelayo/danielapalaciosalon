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
          href="https://wa.me/526699445566"
          target="_blank"
          rel="noopener noreferrer"
          className="border border-[#2A2620] text-[#7A7168] px-6 py-3 text-xs tracking-[0.2em] uppercase hover:border-[#C9A84C] hover:text-[#C9A84C] transition-colors"
        >
          Contactar por WhatsApp
        </a>
        <Link href="/reservar" className="bg-[#C9A84C] text-[#0D0D0D] px-6 py-3 text-xs tracking-[0.2em] uppercase font-semibold hover:bg-[#E8C97A] transition-colors">
          Intentar de nuevo
        </Link>
      </div>
    </div>
  );
}

export default function CanceladoPage() {
  return <Suspense><CanceladoContent /></Suspense>;
}
