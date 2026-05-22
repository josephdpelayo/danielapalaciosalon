'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { InstagramIcon } from '@/components/icons';
import { formatDuration, formatPrice } from '@/lib/slots';
import { MOCK_SERVICES } from '@/lib/mock-data';
import type { Service } from '@/lib/types';

const GALLERY = [
  { src: '/gallery/dp-red.jpg',   alt: 'Color rojo intenso' },
  { src: '/gallery/dp-waves.jpg', alt: 'Ondas naturales' },
  { src: '/gallery/dp-sign.jpg',  alt: 'Daniela Palacio Hair Room' },
  { src: '/gallery/dp-back.jpg',  alt: 'Cabello liso sedoso' },
];

const HOURS = [
  { days: 'Lunes — Viernes', time: '10:00 am — 7:00 pm' },
  { days: 'Sábado',          time: '10:00 am — 3:00 pm'  },
  { days: 'Domingo',         time: 'Cerrado'              },
];

const STEPS = [
  { n: '01', title: 'Elige tu servicio',   desc: 'Selecciona el tratamiento que deseas y consulta el tiempo estimado.' },
  { n: '02', title: 'Escoge fecha y hora', desc: 'Ve el calendario en tiempo real con la disponibilidad del estudio.'  },
  { n: '03', title: 'Confirma tu cita',    desc: 'Recibirás confirmación y recordatorio directo en tu teléfono.'       },
];

export default function Home() {
  const [services, setServices] = useState<Service[]>(MOCK_SERVICES);

  useEffect(() => {
    fetch('/api/services')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.services?.length) setServices(data.services); })
      .catch(() => {});
  }, []);

  return (
    <main style={{ background: '#000000', color: '#F0EDE8' }} className="overflow-x-hidden">

      {/* ── NAV ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-4 md:px-16 md:py-5"
        style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
      >
        <span
          className="font-[family-name:var(--font-display)] text-xs tracking-[0.3em] uppercase"
          style={{ color: '#F0EDE8' }}
        >
          Daniela Palacio
        </span>
        <Link
          href="/reservar"
          className="text-[11px] tracking-[0.25em] uppercase transition-opacity hover:opacity-60"
          style={{ color: '#C9A84C' }}
        >
          Reservar
        </Link>
      </nav>

      {/* ── HERO ── */}
      <section
        className="min-h-screen relative flex flex-col justify-end px-5 pb-16 md:px-16 md:pb-28"
        style={{ paddingTop: '80px' }}
      >
        {/* Background — Daniela editorial portrait */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/gallery/daniela-hero.jpg"
            alt="Daniela Palacio"
            fill
            priority
            className="object-cover"
            style={{ objectPosition: 'center 18%', filter: 'brightness(0.42) contrast(1.12) saturate(0.85)' }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #000 32%, rgba(0,0,0,0.18) 58%, rgba(0,0,0,0.52) 100%)' }} />
        </div>
        <div className="relative z-10">
        <p
          className="text-[10px] tracking-[0.45em] uppercase mb-10"
          style={{ color: '#555555' }}
        >
          Hair Room — Mazatlán, Sin.
        </p>

        <h1
          className="font-[family-name:var(--font-display)] leading-none tracking-tight mb-10"
          style={{ fontSize: 'clamp(72px, 14vw, 180px)', fontWeight: 300 }}
        >
          <span className="block">DANIELA</span>
          <span className="block" style={{ color: '#C9A84C' }}>PALACIO</span>
        </h1>

        <p
          className="text-[13px] tracking-wide mb-12 max-w-xs"
          style={{ color: '#888888', lineHeight: 1.7 }}
        >
          Especialistas en color, cortes y tratamientos capilares de alta calidad.
        </p>

        <Link
          href="/reservar"
          className="inline-flex items-center gap-2 text-sm tracking-[0.15em] transition-opacity hover:opacity-70 py-3"
          style={{
            color: '#F0EDE8',
            borderBottom: '1px solid rgba(240,237,232,0.4)',
            paddingBottom: '6px',
          }}
        >
          Reservar cita →
        </Link>
        </div>
      </section>

      {/* ── PHOTO STRIP ── */}
      <section className="overflow-x-auto scrollbar-none" style={{ paddingBottom: '0' }}>
        <div className="flex gap-1 min-w-max md:grid md:grid-cols-4 md:min-w-0">
          {GALLERY.map((photo) => (
            <div
              key={photo.src}
              className="relative shrink-0 overflow-hidden"
              style={{ width: '72vw', maxWidth: '320px', aspectRatio: '3/4' }}
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                className="object-cover transition-transform duration-700 hover:scale-105"
                style={{ objectPosition: 'center top', filter: 'brightness(0.9)' }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Mobile scroll hint — only visible on small screens */}
      <p className="md:hidden text-center text-[10px] tracking-[0.25em] uppercase py-3" style={{ color: '#2a2a2a' }}>
        ← desliza →
      </p>

      {/* ── SERVICES ── */}
      <section
        id="servicios"
        className="px-5 md:px-16"
        style={{ paddingTop: '96px', paddingBottom: '96px' }}
      >
        <div className="max-w-3xl">
          <p
            className="text-[10px] tracking-[0.45em] uppercase mb-16"
            style={{ color: '#555555' }}
          >
            Servicios
          </p>

          <div>
            {services.map((service, i) => (
              <Link
                key={service.id}
                href={`/reservar?service=${service.id}`}
                className="group flex items-baseline justify-between py-5 transition-colors"
                style={{
                  borderTop: i === 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div>
                  <span
                    className="font-[family-name:var(--font-display)] text-lg md:text-xl transition-colors group-hover:text-[#C9A84C]"
                    style={{ color: '#F0EDE8' }}
                  >
                    {service.name}
                  </span>
                  <span
                    className="block text-[11px] tracking-wide mt-0.5"
                    style={{ color: '#555555' }}
                  >
                    {formatDuration(service.duration_minutes)}
                  </span>
                </div>
                <div className="flex items-center gap-3 ml-8 shrink-0">
                  <span
                    className="text-sm font-light tabular-nums"
                    style={{ color: '#F0EDE8' }}
                  >
                    {formatPrice(service.price)}
                  </span>
                  <span
                    className="text-[#C9A84C] opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 text-xs"
                  >
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section
        className="px-5 md:px-16"
        style={{ paddingTop: '96px', paddingBottom: '96px' }}
      >
        <p
          className="text-[10px] tracking-[0.45em] uppercase mb-16"
          style={{ color: '#555555' }}
        >
          Proceso
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8 max-w-5xl">
          {STEPS.map((step) => (
            <div key={step.n}>
              <span
                className="font-[family-name:var(--font-display)] block leading-none mb-6"
                style={{ fontSize: 'clamp(56px, 7vw, 96px)', color: '#1a1a1a', fontWeight: 300 }}
              >
                {step.n}
              </span>
              <h3
                className="font-[family-name:var(--font-display)] text-lg mb-3"
                style={{ color: '#F0EDE8', fontWeight: 400 }}
              >
                {step.title}
              </h3>
              <p
                className="text-[13px] leading-relaxed"
                style={{ color: '#555555' }}
              >
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOURS ── */}
      <section
        className="px-5 md:px-16"
        style={{ paddingTop: '96px', paddingBottom: '96px' }}
      >
        <div className="max-w-sm">
          <p
            className="text-[10px] tracking-[0.45em] uppercase mb-16"
            style={{ color: '#555555' }}
          >
            Horarios
          </p>

          <div>
            {HOURS.map((h, i) => (
              <div
                key={h.days}
                className="flex items-baseline justify-between py-4"
                style={{
                  borderTop: i === 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <span
                  className="text-[13px] tracking-wide"
                  style={{ color: '#555555' }}
                >
                  {h.days}
                </span>
                <span
                  className="text-[13px] font-light ml-8 shrink-0"
                  style={{ color: h.time === 'Cerrado' ? '#333333' : '#F0EDE8' }}
                >
                  {h.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INSTAGRAM CTA ── */}
      <section
        className="px-5 md:px-16"
        style={{ paddingTop: '64px', paddingBottom: '96px' }}
      >
        <a
          href="https://instagram.com/danielapalaciosalon"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 transition-opacity hover:opacity-60"
          style={{ color: '#F0EDE8' }}
        >
          <InstagramIcon size={14} />
          <span
            className="text-[13px] tracking-[0.1em]"
            style={{ borderBottom: '1px solid rgba(240,237,232,0.3)', paddingBottom: '2px' }}
          >
            @danielapalaciosalon →
          </span>
        </a>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="px-5 md:px-16 py-8 flex items-center justify-between gap-4 flex-wrap"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <p
          className="text-[11px] tracking-[0.2em]"
          style={{ color: '#333333' }}
        >
          © 2025 Daniela Palacio Hair Room — Mazatlán, Sin.
        </p>
        <a
          href="https://wa.me/526699445566"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] tracking-[0.2em] transition-opacity hover:opacity-60"
          style={{ color: '#C9A84C' }}
        >
          WhatsApp →
        </a>
      </footer>

    </main>
  );
}
