'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

function ExitoContent() {
  const searchParams = useSearchParams();
  const id        = searchParams.get('id');
  const isPending = searchParams.get('pending') === '1';
  const isManual  = searchParams.get('manual')  === '1';
  const isTrusted = searchParams.get('trusted') === '1';
  const service   = searchParams.get('service');
  const date      = searchParams.get('date');
  const time      = searchParams.get('time');

  const refCode = id ? id.toString().slice(-8).toUpperCase() : null;

  const subtext = isTrusted
    ? 'Confirmada automáticamente — gracias por ser clienta frecuente.'
    : isManual
    ? 'Daniela te contactará por WhatsApp para coordinar el anticipo y confirmar tu lugar.'
    : isPending
    ? 'Cuando MercadoPago confirme el pago, tu cita quedará activa automáticamente.'
    : 'Daniela te confirmará por WhatsApp en breve. ¡Te esperamos!';

  const rows = [
    service && { label: 'Servicio', value: service },
    date    && { label: 'Fecha',    value: date    },
    time    && { label: 'Hora',     value: time    },
    refCode && { label: 'Ref.',     value: `#${refCode}` },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#16181E', color: '#F0EDE8', fontFamily: 'var(--font-body)' }}
    >
      <style>{`
        @keyframes drawCircle { to { stroke-dashoffset: 0; } }
        @keyframes drawCheck  { to { stroke-dashoffset: 0; } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Nav ── */}
      <nav className="px-6 md:px-10 py-5">
        <Image
          src="/logos/logo-largo.png"
          alt="Daniela Palacio"
          width={140}
          height={26}
          style={{ filter: 'brightness(0) invert(1)', opacity: 0.55, width: '140px', height: 'auto' }}
        />
      </nav>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center pb-20">

        {/* Animated check */}
        <div
          className="mb-10"
          style={{ opacity: 0, animation: 'fadeUp 0.5s ease-out 0.1s forwards' }}
        >
          <svg width="56" height="56" viewBox="0 0 96 96" fill="none" aria-hidden="true">
            <circle
              cx="48" cy="48" r="45"
              stroke="#81807F" strokeWidth="1"
              strokeDasharray="283" strokeDashoffset="283"
              style={{ animation: 'drawCircle 1s cubic-bezier(0.4,0,0.2,1) 0.2s forwards' }}
            />
            <polyline
              points="31,50 43,62 67,37"
              stroke="#F0EDE8" strokeWidth="1.2"
              strokeLinecap="round" strokeLinejoin="round"
              fill="none" strokeDasharray="58" strokeDashoffset="58"
              style={{ animation: 'drawCheck 0.4s ease-out 1.05s forwards' }}
            />
          </svg>
        </div>

        {/* Title */}
        <h1
          className="font-[family-name:var(--font-display)]"
          style={{
            fontSize: 'clamp(20px, 5vw, 26px)',
            fontWeight: 300,
            color: '#F0EDE8',
            letterSpacing: '0.02em',
            marginBottom: '10px',
            opacity: 0,
            animation: 'fadeUp 0.6s ease-out 0.95s forwards',
          }}
        >
          {isPending ? 'Pago en proceso' : 'Tu cita está confirmada'}
        </h1>

        {/* Subtext */}
        <p
          style={{
            fontSize: '12px',
            lineHeight: 1.8,
            color: '#686560',
            maxWidth: '280px',
            marginBottom: '48px',
            opacity: 0,
            animation: 'fadeUp 0.6s ease-out 1.05s forwards',
          }}
        >
          {subtext}
        </p>

        {/* Booking details */}
        {rows.length > 0 && (
          <div
            className="w-full max-w-[300px] text-left mb-12"
            style={{
              border: '1px solid rgba(255,255,255,0.06)',
              padding: '0 20px',
              opacity: 0,
              animation: 'fadeUp 0.6s ease-out 1.15s forwards',
            }}
          >
            {rows.map(({ label, value }, i) => (
              <div
                key={label}
                className="flex items-baseline justify-between"
                style={{
                  paddingTop: '14px',
                  paddingBottom: '14px',
                  borderBottom: i < rows.length - 1
                    ? '1px solid rgba(255,255,255,0.04)'
                    : 'none',
                }}
              >
                <span
                  style={{
                    fontSize: '9px',
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    color: '#484848',
                  }}
                >
                  {label}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 300,
                    color: '#A09F9E',
                    marginLeft: '16px',
                    textAlign: 'right',
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <Link
          href="/"
          className="hover:opacity-50 transition-opacity duration-200"
          style={{
            fontSize: '10px',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color: '#F0EDE8',
            fontWeight: 300,
            borderBottom: '1px solid rgba(240,237,232,0.2)',
            paddingBottom: '2px',
            opacity: 0,
            animation: 'fadeUp 0.6s ease-out 1.3s forwards',
          }}
        >
          Volver al inicio
        </Link>
      </div>

      {/* ── Footer ── */}
      <div
        className="px-6 md:px-10 py-5 flex items-center justify-between"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.04)',
          opacity: 0,
          animation: 'fadeUp 0.4s ease-out 1.5s forwards',
        }}
      >
        <p style={{ fontSize: '10px', color: '#3A3A3A', letterSpacing: '0.1em' }}>
          © 2025 Daniela Palacio Hair Room
        </p>
        <a
          href="https://wa.me/526691877077"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:opacity-70 transition-opacity duration-200"
          style={{
            fontSize: '9px',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: '#505050',
          }}
        >
          WA →
        </a>
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
