'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type State = 'loading' | 'success' | 'error';

interface AptData {
  client_name?: string;
  service?: string;
  date?: string;
  time?: string;
}

function ConfirmarContent() {
  const searchParams = useSearchParams();
  const id    = searchParams.get('id');
  const token = searchParams.get('token');

  const [state, setState] = useState<State>('loading');
  const [apt,   setApt]   = useState<AptData | null>(null);

  useEffect(() => {
    if (!id || !token) { setState('error'); return; }
    fetch(`/api/confirm?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) { setApt(d); setState('success'); }
        else        setState('error');
      })
      .catch(() => setState('error'));
  }, [id, token]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: '#000000' }}
    >
      <style>{`
        @keyframes draw-circle { to { stroke-dashoffset: 0; } }
        @keyframes draw-check  { to { stroke-dashoffset: 0; } }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ── Loading ── */}
      {state === 'loading' && (
        <div style={{ opacity: 0.4 }}>
          <div
            style={{
              width: 40, height: 40,
              borderRadius: '50%',
              border: '1.5px solid rgba(201,168,76,0.3)',
              borderTopColor: '#C9A84C',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        </div>
      )}

      {/* ── Success ── */}
      {state === 'success' && (
        <>
          <div className="mb-10">
            <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle
                cx="48" cy="48" r="46"
                stroke="#C9A84C" strokeWidth="1.5"
                strokeDasharray="289" strokeDashoffset="289"
                style={{ animation: 'draw-circle 0.9s cubic-bezier(0.4,0,0.2,1) 0.1s forwards' }}
              />
              <polyline
                points="30,50 43,63 66,36"
                stroke="#C9A84C" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round"
                fill="none" strokeDasharray="56"
                style={{ strokeDashoffset: 56, animation: 'draw-check 0.45s ease-out 0.8s forwards' }}
              />
            </svg>
          </div>

          <h1
            className="font-[family-name:var(--font-display)] text-3xl font-light mb-4 leading-tight"
            style={{ color: '#F0EDE8', letterSpacing: '-0.01em', opacity: 0, animation: 'fade-up 0.6s ease-out 0.95s forwards' }}
          >
            ¡Gracias{apt?.client_name ? `, ${apt.client_name.split(' ')[0]}` : ''}!
          </h1>

          {(apt?.service || apt?.date) && (
            <div
              className="mb-6 space-y-1"
              style={{ opacity: 0, animation: 'fade-up 0.6s ease-out 1.1s forwards' }}
            >
              {apt.service && (
                <p className="text-[#C9A84C] text-xs tracking-[0.2em] uppercase">{apt.service}</p>
              )}
              {apt.date && (
                <p className="text-[#555555] text-xs tracking-wider">
                  {apt.date} {apt.time ? `· ${(apt.time as string).slice(0, 5)}` : ''}
                </p>
              )}
            </div>
          )}

          <p
            className="text-[#555555] text-sm max-w-xs leading-relaxed mb-10"
            style={{ opacity: 0, animation: 'fade-up 0.6s ease-out 1.2s forwards' }}
          >
            Tu cita está confirmada. Te esperamos con gusto.
          </p>

          <div
            className="w-full max-w-xs"
            style={{ opacity: 0, animation: 'fade-up 0.6s ease-out 1.3s forwards' }}
          >
            <Link
              href="/"
              className="block w-full py-3 text-[11px] tracking-[0.2em] uppercase text-center transition-colors hover:text-[#C9A84C]"
              style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#555555' }}
            >
              Ir al inicio
            </Link>
          </div>
        </>
      )}

      {/* ── Error ── */}
      {state === 'error' && (
        <>
          <p
            className="font-[family-name:var(--font-display)] text-2xl font-light mb-4"
            style={{ color: '#F0EDE8' }}
          >
            Link no válido
          </p>
          <p className="text-[#555555] text-sm max-w-xs leading-relaxed mb-10">
            Este link ya fue usado o no es válido. Si tienes dudas escríbele a Daniela directamente.
          </p>
          <a
            href="https://wa.me/526691877077"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] tracking-[0.2em] uppercase transition-opacity hover:opacity-70"
            style={{ color: '#C9A84C' }}
          >
            Contactar por WhatsApp →
          </a>
        </>
      )}
    </div>
  );
}

export default function ConfirmarPage() {
  return (
    <Suspense>
      <ConfirmarContent />
    </Suspense>
  );
}
