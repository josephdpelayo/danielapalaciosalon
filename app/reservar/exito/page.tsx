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
      <style>{`
        @keyframes draw-circle {
          to { stroke-dashoffset: 0; }
        }
        @keyframes draw-check {
          to { stroke-dashoffset: 0; }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Thin gold circle with checkmark — animated */}
      <div className="mb-10">
        <svg
          width="96"
          height="96"
          viewBox="0 0 96 96"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="48" cy="48" r="46"
            stroke="#C9A84C" strokeWidth="1.5"
            strokeDasharray="289"
            strokeDashoffset="289"
            style={{ animation: 'draw-circle 0.9s cubic-bezier(0.4,0,0.2,1) 0.15s forwards' }}
          />
          <polyline
            points="30,50 43,63 66,36"
            stroke="#C9A84C"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray="56"
            style={{ strokeDashoffset: 56, animation: 'draw-check 0.45s ease-out 0.85s forwards' }}
          />
        </svg>
      </div>

      {/* Headline */}
      <h1
        className="font-[family-name:var(--font-display)] text-3xl font-light text-[#F0EDE8] mb-5 leading-tight"
        style={{ letterSpacing: '-0.01em', opacity: 0, animation: 'fade-up 0.6s ease-out 1.05s forwards' }}
      >
        {headline}
      </h1>

      {/* Service + date/time if available */}
      {(service || date || time) && (
        <div className="mb-6 space-y-1" style={{ opacity: 0, animation: 'fade-up 0.6s ease-out 1.2s forwards' }}>
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
      <p className="text-[#555555] text-sm max-w-xs leading-relaxed mb-3"
        style={{ opacity: 0, animation: 'fade-up 0.6s ease-out 1.3s forwards' }}>
        {subtext}
      </p>

      {/* WA confirmation note */}
      {!isTrusted && (
        <p className="text-[#C9A84C]/70 text-[11px] tracking-[0.12em] uppercase max-w-xs leading-relaxed mb-2"
          style={{ opacity: 0, animation: 'fade-up 0.6s ease-out 1.38s forwards' }}>
          Daniela te confirmará tu cita por WhatsApp en breve.
        </p>
      )}

      {/* Reference */}
      {id && (
        <p className="text-[#2a2a2a] text-[11px] tracking-[0.15em] uppercase mb-10"
          style={{ opacity: 0, animation: 'fade-up 0.6s ease-out 1.4s forwards' }}>
          Ref. #{id.toString().slice(-8).toUpperCase()}
        </p>
      )}
      {!id && <div className="mb-10" />}

      {/* Actions */}
      <div className="w-full max-w-xs"
        style={{ opacity: 0, animation: 'fade-up 0.6s ease-out 1.5s forwards' }}>
        <Link
          href="/"
          className="block w-full py-3 text-[11px] tracking-[0.2em] uppercase text-center transition-colors hover:text-[#C9A84C]"
          style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#555555' }}
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
