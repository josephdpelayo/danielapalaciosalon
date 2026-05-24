'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

const RECS = [
  'Llega 5 minutos antes de tu cita.',
  'Si necesitas cancelar, avisa con al menos 24 horas de anticipación.',
  'Ven con el cabello lavado y sin productos si es posible.',
  'Si tienes alguna alergia o condición especial, coméntalo al llegar.',
];

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
      <div className="flex-1 flex flex-col items-center px-6 pb-20" style={{ paddingTop: '40px' }}>
        <div className="w-full max-w-[320px] flex flex-col items-center text-center">

          {/* Animated check */}
          <div
            className="mb-8"
            style={{ opacity: 0, animation: 'fadeUp 0.5s ease-out 0.1s forwards' }}
          >
            <svg width="52" height="52" viewBox="0 0 96 96" fill="none" aria-hidden="true">
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
              marginBottom: '40px',
              opacity: 0,
              animation: 'fadeUp 0.6s ease-out 1.05s forwards',
            }}
          >
            {subtext}
          </p>

          {/* Booking details card */}
          {rows.length > 0 && (
            <div
              className="w-full text-left mb-10"
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
                    paddingTop: '13px',
                    paddingBottom: '13px',
                    borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}
                >
                  <span style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#484848' }}>
                    {label}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 300, color: '#A09F9E', marginLeft: '16px', textAlign: 'right' }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Volver al inicio */}
          <Link
            href="/"
            className="hover:opacity-50 transition-opacity duration-200 mb-14"
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

          {/* ── Divider ── */}
          <div
            className="w-full mb-14"
            style={{ height: '1px', background: 'rgba(255,255,255,0.05)', opacity: 0, animation: 'fadeUp 0.4s ease-out 1.4s forwards' }}
          />

          {/* ── WhatsApp CTA ── */}
          <div
            className="w-full mb-12"
            style={{ opacity: 0, animation: 'fadeUp 0.6s ease-out 1.45s forwards' }}
          >
            <p
              className="font-[family-name:var(--font-display)]"
              style={{ fontSize: '16px', fontWeight: 300, color: '#F0EDE8', marginBottom: '6px', letterSpacing: '0.01em' }}
            >
              ¿Tienes alguna duda?
            </p>
            <p style={{ fontSize: '12px', color: '#686560', lineHeight: 1.7, marginBottom: '20px' }}>
              Escríbenos con confianza. Daniela responde personalmente en horario de atención.
            </p>
            <a
              href="https://wa.me/526691877077"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center hover:opacity-80 transition-opacity duration-200"
              style={{
                background: '#F0EDE8',
                color: '#16181E',
                fontSize: '10px',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                fontWeight: 400,
                padding: '14px 0',
              }}
            >
              Escribir por WhatsApp
            </a>
            <p style={{ fontSize: '9px', color: '#484848', letterSpacing: '0.1em', marginTop: '8px' }}>
              Lun–Vie 10am–7pm &nbsp;·&nbsp; Sáb 10am–3pm
            </p>
          </div>

          {/* ── Recomendaciones ── */}
          <div
            className="w-full text-left mb-12"
            style={{ opacity: 0, animation: 'fadeUp 0.6s ease-out 1.55s forwards' }}
          >
            <p
              style={{
                fontSize: '9px',
                letterSpacing: '0.4em',
                textTransform: 'uppercase',
                color: '#686560',
                marginBottom: '20px',
              }}
            >
              Antes de tu cita
            </p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {RECS.map((rec) => (
                <li
                  key={rec}
                  className="flex items-start gap-3"
                  style={{ fontSize: '12px', color: '#686560', lineHeight: 1.7 }}
                >
                  <span style={{ color: '#484848', flexShrink: 0, marginTop: '1px' }}>—</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>

          {/* ── FAQ link ── */}
          <div
            className="w-full"
            style={{ opacity: 0, animation: 'fadeUp 0.6s ease-out 1.65s forwards' }}
          >
            <Link
              href="/#faq"
              className="block w-full text-center hover:opacity-60 transition-opacity duration-200"
              style={{
                fontSize: '10px',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: '#81807F',
                fontWeight: 300,
                border: '1px solid rgba(129,128,127,0.2)',
                padding: '13px 0',
              }}
            >
              Preguntas frecuentes
            </Link>
          </div>

        </div>
      </div>

      {/* ── Footer ── */}
      <div
        className="px-6 md:px-10 py-5 flex items-center justify-between"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.04)',
          opacity: 0,
          animation: 'fadeUp 0.4s ease-out 1.75s forwards',
        }}
      >
        <p style={{ fontSize: '10px', color: '#3A3A3A', letterSpacing: '0.1em' }}>
          © 2025 Daniela Palacio Hair Room
        </p>
        <Image
          src="/logos/symbol-x.png"
          alt=""
          width={20}
          height={20}
          style={{ filter: 'brightness(0) invert(1)', opacity: 0.1, width: '20px', height: '20px' }}
        />
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
