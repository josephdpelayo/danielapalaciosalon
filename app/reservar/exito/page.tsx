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
            stroke="#81807F" strokeWidth="1.5"
            strokeDasharray="289"
            strokeDashoffset="289"
            style={{ animation: 'draw-circle 0.9s cubic-bezier(0.4,0,0.2,1) 0.15s forwards' }}
          />
          <polyline
            points="30,50 43,63 66,36"
            stroke="#81807F"
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
            <p className="text-[#81807F] text-xs tracking-[0.2em] uppercase">
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
        <p className="text-[#81807F]/70 text-[11px] tracking-[0.12em] uppercase max-w-xs leading-relaxed mb-2"
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
      <div className="w-full max-w-xs mb-10"
        style={{ opacity: 0, animation: 'fade-up 0.6s ease-out 1.58s forwards' }}>
        <Link
          href="/"
          className="block w-full py-3 text-[11px] tracking-[0.2em] uppercase text-center transition-colors hover:text-[#81807F]"
          style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#555555' }}
        >
          Volver al inicio
        </Link>
      </div>

      {/* Recommendations */}
      <div className="w-full max-w-xs text-left mb-8"
        style={{ opacity: 0, animation: 'fade-up 0.6s ease-out 1.65s forwards' }}>
        <p className="text-[#81807F] text-[10px] tracking-[0.2em] uppercase mb-4">
          Recomendaciones para tu cita
        </p>
        <ul className="space-y-3">
          {[
            'Llega 5 minutos antes de tu cita.',
            'Si necesitas cancelar, avisa con al menos 24 horas de anticipación.',
            'Ven con el cabello lavado y sin productos si es posible.',
            'Si tienes alguna alergia o condición especial, coméntalo al llegar.',
          ].map((rec) => (
            <li key={rec} className="flex items-start gap-2 text-[#555555] text-[12px] leading-relaxed">
              <span className="mt-[3px] shrink-0 text-[#81807F]/50" aria-hidden="true">—</span>
              {rec}
            </li>
          ))}
        </ul>
      </div>

      {/* FAQ button */}
      <div className="w-full max-w-xs mb-8"
        style={{ opacity: 0, animation: 'fade-up 0.6s ease-out 1.72s forwards' }}>
        <Link
          href="/#faq"
          className="block w-full py-3 text-[11px] tracking-[0.2em] uppercase text-center transition-colors hover:text-[#F0EDE8]"
          style={{ border: '1px solid rgba(129,128,127,0.25)', color: '#81807F' }}
        >
          Preguntas frecuentes
        </Link>
      </div>

      {/* Contact message + second WhatsApp button */}
      <div className="w-full max-w-xs text-center mb-10"
        style={{ opacity: 0, animation: 'fade-up 0.6s ease-out 1.78s forwards' }}>
        <p className="text-[#555555] text-[12px] leading-relaxed mb-1">
          ¿Tienes dudas? Escríbenos con confianza en horario de atención:
        </p>
        <p className="text-[#81807F]/70 text-[11px] tracking-[0.08em] mb-5">
          Lun–Vie 10am–7pm&nbsp;&nbsp;|&nbsp;&nbsp;Sáb 10am–3pm
        </p>
        <a
          href="https://wa.me/526691877077"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 text-[11px] tracking-[0.2em] uppercase text-center transition-colors hover:bg-[#25D366]/10"
          style={{ border: '1px solid #25D366', color: '#25D366' }}
        >
          <svg width="15" height="15" viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M16 0C7.163 0 0 7.163 0 16c0 2.822.737 5.47 2.027 7.773L0 32l8.469-2.001A15.938 15.938 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.27 13.27 0 01-6.773-1.849l-.485-.288-5.027 1.187 1.259-4.896-.317-.503A13.267 13.267 0 012.667 16C2.667 8.636 8.636 2.667 16 2.667S29.333 8.636 29.333 16 23.364 29.333 16 29.333zm7.273-9.878c-.398-.199-2.355-1.162-2.72-1.295-.365-.133-.631-.199-.897.199-.266.398-1.030 1.295-1.263 1.561-.233.266-.465.299-.863.1-.398-.2-1.681-.619-3.203-1.977-1.183-1.056-1.982-2.361-2.214-2.759-.233-.398-.025-.613.175-.811.18-.179.398-.465.597-.698.2-.233.266-.398.399-.664.133-.266.067-.499-.033-.698-.1-.2-.897-2.163-1.229-2.96-.324-.778-.653-.672-.897-.684l-.764-.013c-.266 0-.698.1-1.064.499-.365.398-1.396 1.363-1.396 3.326s1.429 3.858 1.628 4.124c.2.266 2.813 4.295 6.816 5.827 4.003 1.532 4.003 1.021 4.726.957.723-.067 2.355-.963 2.688-1.894.333-.931.333-1.729.233-1.894-.1-.166-.365-.266-.763-.465z"/>
          </svg>
          Escríbenos por WhatsApp
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
