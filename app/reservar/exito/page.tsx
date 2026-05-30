'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

const RECS = [
  'Llega 5 minutos antes de tu cita.',
  'Si necesitas cancelar, avisa con al menos 24 horas de anticipación.',
  'Ven con el cabello seco y sin productos si es posible.',
];

function buildICS(dateiso: string, t24: string, service: string, dur: number): string {
  const [y, mo, d] = dateiso.split('-').map(Number);
  const [h, m] = t24.split(':').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  const dtStart = `${y}${pad(mo)}${pad(d)}T${pad(h)}${pad(m)}00`;
  const endMin = h * 60 + m + dur;
  const eH = Math.floor(endMin / 60) % 24;
  const eM = endMin % 60;
  const dtEnd = `${y}${pad(mo)}${pad(d)}T${pad(eH)}${pad(eM)}00`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Daniela Palacio Hair Room//ES',
    'BEGIN:VEVENT',
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${service} — Daniela Palacio Hair Room`,
    'LOCATION:Plaza A2\\, piso 3\\, local 3D\\, Mazatlán\\, Sin.',
    'DESCRIPTION:Estudio de cabello · +52 669 145 9296',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function downloadICS(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ExitoContent() {
  const searchParams = useSearchParams();
  const id        = searchParams.get('id');
  const isPending = searchParams.get('pending') === '1';
  const isManual  = searchParams.get('manual')  === '1';
  const isTrusted = searchParams.get('trusted') === '1';
  const service   = searchParams.get('service') ?? '';
  const date      = searchParams.get('date') ?? '';
  const time      = searchParams.get('time') ?? '';
  const name      = searchParams.get('name') ?? '';
  const dateiso   = searchParams.get('dateiso') ?? '';
  const t24       = searchParams.get('t24') ?? '';
  const dur       = parseInt(searchParams.get('dur') ?? '60', 10);

  const hasCalendar = !!(dateiso && t24);

  const waPhone = process.env.NEXT_PUBLIC_SALON_WHATSAPP ?? '526691459296';
  const waMessage = service && date && time
    ? `Hola Daniela, tengo una cita para ${service} el ${date} a las ${time}. ¿Puedes confirmarme?`
    : '¡Hola Daniela! Tengo una cita agendada y quería confirmar los detalles.';
  const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}`;

  const subtext = isTrusted
    ? 'Confirmada automáticamente — gracias por ser clienta frecuente.'
    : isManual
    ? 'Daniela te contactará por WhatsApp para coordinar el anticipo y confirmar tu lugar.'
    : isPending
    ? 'Cuando MercadoPago confirme el pago, tu cita quedará activa automáticamente.'
    : 'Daniela te confirmará por WhatsApp en breve. ¡Te esperamos!';

  const rows = [
    name    && { label: 'Nombre',   value: name    },
    service && { label: 'Servicio', value: service },
    date    && { label: 'Fecha',    value: date    },
    time    && { label: 'Hora',     value: time    },
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
      <nav className="px-6 md:px-10 py-4">
        <Link href="/">
          <Image
            src="/logos/logo-largo.png"
            alt="Daniela Palacio"
            width={140}
            height={26}
            style={{ filter: 'brightness(0) invert(1)', opacity: 0.55, width: '140px', height: 'auto' }}
          />
        </Link>
      </nav>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col items-center px-6 pb-8" style={{ paddingTop: '24px' }}>
        <div className="w-full max-w-[340px] flex flex-col items-center text-center">

          {/* Animated check */}
          <div style={{ opacity: 0, animation: 'fadeUp 0.5s ease-out 0.1s forwards', marginBottom: '20px' }}>
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
              marginBottom: '8px',
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
              lineHeight: 1.7,
              color: '#686560',
              marginBottom: '28px',
              opacity: 0,
              animation: 'fadeUp 0.6s ease-out 1.05s forwards',
            }}
          >
            {subtext}
          </p>

          {/* Booking details card */}
          {rows.length > 0 && (
            <div
              className="w-full text-left mb-5"
              style={{
                border: '1px solid rgba(255,255,255,0.07)',
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
                    paddingTop: '12px',
                    paddingBottom: '12px',
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

          {/* ── Acciones ── */}
          <div
            className="w-full flex flex-col gap-3 mb-6"
            style={{ opacity: 0, animation: 'fadeUp 0.6s ease-out 1.25s forwards' }}
          >
            {/* Agregar al calendario */}
            {hasCalendar && (
              <button
                onClick={() => downloadICS(buildICS(dateiso, t24, service || 'Cita', dur), 'cita-daniela-palacio.ics')}
                className="w-full text-center hover:opacity-75 transition-opacity duration-200"
                style={{
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#A09F9E',
                  fontSize: '10px',
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  fontWeight: 300,
                  padding: '13px 0',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                Agregar al calendario
              </button>
            )}

            {/* WhatsApp */}
            <a
              href={waUrl}
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
              Escribir a Daniela
            </a>
            <p style={{ fontSize: '9px', color: '#484848', letterSpacing: '0.1em' }}>
              Lun–Vie 10am–7pm · Sáb 10am–3pm
            </p>
          </div>

          {/* ── Divider ── */}
          <div
            className="w-full mb-6"
            style={{ height: '1px', background: 'rgba(255,255,255,0.05)', opacity: 0, animation: 'fadeUp 0.4s ease-out 1.35s forwards' }}
          />

          {/* ── Recomendaciones ── */}
          <div
            className="w-full text-left mb-8"
            style={{ opacity: 0, animation: 'fadeUp 0.6s ease-out 1.4s forwards' }}
          >
            <p style={{ fontSize: '9px', letterSpacing: '0.4em', textTransform: 'uppercase', color: '#686560', marginBottom: '14px' }}>
              Antes de tu cita
            </p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {RECS.map((rec) => (
                <li key={rec} className="flex items-start gap-3" style={{ fontSize: '12px', color: '#686560', lineHeight: 1.65 }}>
                  <span style={{ color: '#484848', flexShrink: 0, marginTop: '2px' }}>—</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>

          {/* Volver */}
          <Link
            href="/"
            className="hover:opacity-50 transition-opacity duration-200"
            style={{
              fontSize: '10px',
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              color: '#505050',
              fontWeight: 300,
              opacity: 0,
              animation: 'fadeUp 0.6s ease-out 1.5s forwards',
            }}
          >
            Volver al inicio
          </Link>

        </div>
      </div>

      {/* ── Footer ── */}
      <div
        className="px-6 md:px-10 py-4 flex items-center justify-between"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.04)',
          opacity: 0,
          animation: 'fadeUp 0.4s ease-out 1.6s forwards',
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
