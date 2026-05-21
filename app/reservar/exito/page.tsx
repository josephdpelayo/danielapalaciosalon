'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ExitoContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const isPending = searchParams.get('pending') === '1';
  const isManual = searchParams.get('manual') === '1';
  const isTrusted = searchParams.get('trusted') === '1';
  const service = searchParams.get('service');
  const date = searchParams.get('date');
  const time = searchParams.get('time');

  const headline = isPending ? 'Pago en proceso' : 'Tu cita está confirmada';

  const subtext = isTrusted
    ? 'Tu cita quedó confirmada automáticamente. ¡Gracias por ser clienta frecuente!'
    : isManual
    ? 'Tu solicitud fue recibida. Daniela te contactará por WhatsApp para coordinar el anticipo y confirmar tu cita.'
    : isPending
    ? 'Tu pago está siendo procesado. Cuando MercadoPago lo confirme, tu cita quedará activa automáticamente.'
    : 'Tu anticipo fue recibido y tu cita está confirmada. ¡Te esperamos!';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: '#000000' }}
    >
      {/* Thin gold circle with checkmark */}
      <div className="mb-10">
        <svg
          width="96"
          height="96"
          viewBox="0 0 96 96"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="48" cy="48" r="46" stroke="#C9A84C" strokeWidth="1.5" />
          <polyline
            points="30,50 43,63 66,36"
            stroke="#C9A84C"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>

      {/* Headline */}
      <h1
        className="font-[family-name:var(--font-display)] text-3xl font-light text-[#F0EDE8] mb-5 leading-tight"
        style={{ letterSpacing: '-0.01em' }}
      >
        {headline}
      </h1>

      {/* Service + date/time if available */}
      {(service || date || time) && (
        <div className="mb-6 space-y-1">
          {service && (
            <p className="text-[#C9A84C] text-xs tracking-[0.2em] uppercase">
              {service}
            </p>
          )}
          {(date || time) && (
            <p className="text-[#555555] text-xs tracking-wider">
              {[date, time].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      )}

      {/* Subtext */}
      <p className="text-[#555555] text-sm max-w-xs leading-relaxed mb-4">
        {subtext}
      </p>

      {/* Reference */}
      {id && (
        <p className="text-[#2a2a2a] text-[11px] tracking-[0.15em] uppercase mb-10">
          Ref. #{id.toString().slice(-8).toUpperCase()}
        </p>
      )}
      {!id && <div className="mb-10" />}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <a
          href="https://wa.me/526699445566"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-3 text-[11px] tracking-[0.2em] uppercase font-semibold transition-opacity hover:opacity-80"
          style={{ background: '#C9A84C', color: '#000000' }}
        >
          WhatsApp
        </a>
        <Link
          href="/"
          className="flex-1 py-3 text-[11px] tracking-[0.2em] uppercase transition-colors hover:text-[#C9A84C]"
          style={{
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#555555',
          }}
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

export default function ExitoPage() {
  return (
    <Suspense>
      <ExitoContent />
    </Suspense>
  );
}
