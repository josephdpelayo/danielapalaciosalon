'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { InstagramIcon } from '@/components/icons';
import { formatDuration, formatPrice } from '@/lib/slots';
import { MOCK_SERVICES } from '@/lib/mock-data';
import type { Service } from '@/lib/types';

const GALLERY = [
  {
    src:    '/gallery/dp-balayage.jpg',
    alt:    'Balayage — resultado final',
    pos:    'center top',
    filter: 'brightness(0.96) contrast(1.04) saturate(0.9)',
  },
  {
    src:    '/gallery/dp-texture.jpg',
    alt:    'Textura y color natural',
    pos:    'center center',
    filter: 'brightness(0.93) contrast(1.06) saturate(0.88)',
  },
  {
    src:    '/gallery/dp-wash.jpg',
    alt:    'Tratamiento capilar en salón',
    pos:    'center 30%',
    filter: 'brightness(0.88) contrast(1.1)',
  },
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

const REVIEWS = [
  { name: 'Fernanda R.',  service: 'Balayage',           text: 'El mejor balayage que me han hecho. Daniela entendió exactamente lo que quería desde la primera consulta.' },
  { name: 'Sofía M.',     service: 'Hair color',          text: 'Mi cabello quedó súper saludable y con un color hermoso. El ambiente del estudio es increíble.' },
  { name: 'Valeria T.',   service: 'Corte + tratamiento', text: 'Puntual, profesional y con una técnica impecable. Ya agendé mi próxima cita.' },
  { name: 'Mariana L.',   service: 'Mechas',              text: 'Llevaba meses sin hacerme nada y Daniela transformó mi cabello completamente. 100% recomendada.' },
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
    <main
      style={{ background: '#16181E', color: '#F0EDE8', fontFamily: 'var(--font-body)' }}
      className="overflow-x-hidden"
    >

      {/* ── NAV ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-16"
        style={{
          paddingTop: '20px',
          paddingBottom: '20px',
          background: 'rgba(16,18,20,0.93)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <Image
          src="/logos/logo-largo.png"
          alt="Daniela Palacio"
          width={180}
          height={34}
          style={{ filter: 'brightness(0) invert(1)', opacity: 0.85, width: '180px', height: 'auto' }}
          priority
        />
        <Link
          href="/reservar"
          style={{
            color: '#F0EDE8',
            fontSize: '10px',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            fontWeight: 300,
            transition: 'opacity 0.2s',
          }}
          className="hover:opacity-50"
        >
          Reservar
        </Link>
      </nav>

      {/* ── HERO ── */}
      <section
        className="min-h-screen relative flex flex-col items-center justify-center text-center"
        style={{ paddingTop: '80px' }}
      >
        {/* Background photo */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/gallery/daniela-hero.jpg"
            alt="Daniela Palacio Hair Room"
            fill
            priority
            className="object-cover"
            style={{
              objectPosition: 'center 18%',
              filter: 'brightness(0.58) contrast(1.1) saturate(0.75)',
            }}
          />
          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom, rgba(16,18,20,0.55) 0%, rgba(16,18,20,0.1) 40%, rgba(16,18,20,0.82) 100%)',
            }}
          />
        </div>

        {/* Hero content — centered */}
        <div
          className="relative z-10 flex flex-col items-center"
          style={{ animation: 'heroFadeIn 1.2s ease forwards' }}
        >
          {/* Location line above logo */}
          <p
            style={{
              fontSize: '9px',
              letterSpacing: '0.55em',
              textTransform: 'uppercase',
              color: '#787878',
              marginBottom: '36px',
            }}
          >
            Mazatlán, Sinaloa
          </p>

          {/* Logo full */}
          <div style={{ marginBottom: '32px' }}>
            <Image
              src="/logos/logo-full.png"
              alt="Daniela Palacio Hair Room"
              width={440}
              height={360}
              priority
              style={{
                filter: 'brightness(0) invert(1)',
                opacity: 0.95,
                width: 'min(440px, 75vw)',
                height: 'auto',
              }}
            />
          </div>

          {/* Tagline below logo */}
          <p
            style={{
              fontSize: '10px',
              letterSpacing: '0.4em',
              textTransform: 'uppercase',
              color: '#787878',
              marginBottom: '48px',
            }}
          >
            cuidado que transforma
          </p>

          {/* CTA */}
          <Link
            href="/reservar"
            style={{
              fontSize: '10px',
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              color: '#F0EDE8',
              fontWeight: 300,
              borderBottom: '1px solid rgba(240,237,232,0.25)',
              paddingBottom: '2px',
              transition: 'opacity 0.2s',
            }}
            className="hover:opacity-50"
          >
            Reservar cita
          </Link>

        </div>

        {/* Scroll indicator — centro inferior */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center"
          style={{ zIndex: 10 }}
        >
          <div
            style={{
              width: '1px',
              height: '40px',
              background: 'linear-gradient(to bottom, transparent, rgba(240,237,232,0.25))',
              animation: 'scrollPulse 2s ease-in-out infinite',
            }}
          />
        </div>

        {/* WhatsApp — esquina inferior derecha del hero */}
        <a
          href="https://wa.me/526691877077"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-6 right-6 hover:opacity-70 transition-opacity duration-200"
          style={{
            fontSize: '9px',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: 'rgba(240,237,232,0.35)',
            fontWeight: 300,
            zIndex: 10,
          }}
        >
          WA →
        </a>
      </section>

      {/* ── PHOTO STRIP ── */}
      {/* Mobile: horizontal scroll. Desktop: 3-column grid with 1px black gaps */}
      <section
        className="relative overflow-x-auto md:overflow-x-visible"
        style={{ scrollbarWidth: 'none' }}
      >
        {/* Mobile gradient hint — indicates more photos to the right */}
        <div
          className="md:hidden absolute right-0 top-0 bottom-0 z-10 pointer-events-none"
          style={{
            width: '48px',
            background: 'linear-gradient(to right, transparent, #16181E)',
          }}
        />
        {/* Mobile wrapper — flex scroll */}
        <div className="flex md:hidden" style={{ gap: '1px', minWidth: 'max-content' }}>
          {GALLERY.map((photo) => (
            <div
              key={photo.src}
              className="relative shrink-0 overflow-hidden"
              style={{ width: '80vw', maxWidth: '440px', aspectRatio: '3/4' }}
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                unoptimized
                className="object-cover transition-transform duration-700 hover:scale-[1.03]"
                style={{ objectPosition: photo.pos, filter: photo.filter }}
              />
            </div>
          ))}
        </div>
        {/* Desktop wrapper — CSS grid */}
        <div className="hidden md:grid md:grid-cols-3" style={{ gap: '1px', background: '#16181E' }}>
          {GALLERY.map((photo) => (
            <div
              key={photo.src}
              className="relative overflow-hidden"
              style={{ aspectRatio: '4/5', width: '100%' }}
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                unoptimized
                className="object-cover transition-transform duration-700 hover:scale-[1.03]"
                style={{ objectPosition: photo.pos, filter: photo.filter }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── BRAND STATEMENT ── */}
      <section
        className="px-6 md:px-16"
        style={{ paddingTop: '56px', paddingBottom: '28px' }}
      >
        <p
          style={{
            fontSize: '9px',
            letterSpacing: '0.5em',
            textTransform: 'uppercase',
            color: '#686560',
            marginBottom: '28px',
          }}
        >
          El estudio
        </p>
        <p
          style={{
            fontSize: '13px',
            lineHeight: 2,
            color: '#606060',
            maxWidth: '400px',
            fontWeight: 300,
          }}
        >
          Hola, ¡hermosa! Nuestra prioridad es la salud de tu cabello.
          Cada servicio combina técnica profesional con productos y
          procesos que lo protegen, nutren y realzan.
        </p>
      </section>

      {/* ── SERVICES ── */}
      <section
        id="servicios"
        className="px-6 md:px-16"
        style={{ paddingBottom: '56px' }}
      >
        <div className="max-w-3xl">
          <p
            style={{
              fontSize: '9px',
              letterSpacing: '0.5em',
              textTransform: 'uppercase',
              color: '#686560',
              marginBottom: '48px',
            }}
          >
            Servicios
          </p>

          {(() => {
            const serviceGroups = services.reduce((acc, s) => {
              const cat = (s as Service & { category?: string }).category ?? '';
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(s);
              return acc;
            }, {} as Record<string, Service[]>);
            const categoryOrder = ['Basic', 'Hair color', 'Tratamientos capilares', ''];
            const sortedCategories = categoryOrder.filter((c) => serviceGroups[c]?.length);

            return sortedCategories.map((cat) => (
              <div key={cat} style={{ marginBottom: '40px' }}>
                {cat && (
                  <p
                    style={{
                      fontSize: '9px',
                      letterSpacing: '0.4em',
                      textTransform: 'uppercase',
                      color: '#686560',
                      marginBottom: '16px',
                    }}
                  >
                    {cat}
                  </p>
                )}
                <div>
                  {serviceGroups[cat].map((service, i) => {
                    const isWhatsApp = service.price === null;
                    const href = isWhatsApp
                      ? `https://wa.me/526691877077?text=${encodeURIComponent('Hola, me interesa información sobre Hair color')}`
                      : `/reservar?service=${service.id}`;
                    const linkProps = isWhatsApp
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {};

                    return (
                      <Link
                        key={service.id}
                        href={href}
                        {...linkProps}
                        className="group flex items-baseline justify-between"
                        style={{
                          paddingTop: '20px',
                          paddingBottom: '20px',
                          borderTop: i === 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          transition: 'opacity 0.2s',
                        }}
                      >
                        <div>
                          <span
                            className="font-[family-name:var(--font-display)] group-hover:opacity-50 transition-opacity duration-300"
                            style={{
                              fontSize: 'clamp(16px, 2vw, 18px)',
                              color: '#F0EDE8',
                              fontWeight: 300,
                            }}
                          >
                            {service.name}
                          </span>
                          <span
                            className="block mt-1"
                            style={{ fontSize: '10px', color: '#686560' }}
                          >
                            {formatDuration(service.duration_minutes)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 ml-8 shrink-0">
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 300,
                              color: '#81807F',
                            }}
                          >
                            {service.price === null
                              ? 'Consultar'
                              : `desde ${formatPrice(service.price)}`}
                          </span>
                          <span
                            className="opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-[0.35] group-hover:translate-x-0"
                            style={{ color: '#81807F', fontSize: '13px' }}
                          >
                            →
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </div>
      </section>

      {/* ── X DIVIDER ── */}
      <div
        className="flex justify-center"
        style={{ paddingTop: '32px', paddingBottom: '32px' }}
      >
        <Image
          src="/logos/symbol-x.png"
          alt=""
          width={36}
          height={36}
          style={{ filter: 'brightness(0) invert(1)', opacity: 0.14, width: '36px', height: '36px' }}
        />
      </div>

      {/* ── PROCESS ── */}
      <section
        className="px-6 md:px-16"
        style={{ paddingBottom: '48px' }}
      >
        <p
          style={{
            fontSize: '9px',
            letterSpacing: '0.5em',
            textTransform: 'uppercase',
            color: '#686560',
            marginBottom: '40px',
          }}
        >
          Proceso
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 max-w-5xl">
          {STEPS.map((step) => (
            <div key={step.n}>
              <p
                style={{
                  fontSize: '11px',
                  letterSpacing: '0.2em',
                  color: '#505050',
                  fontWeight: 300,
                  marginBottom: '14px',
                }}
              >
                {step.n}
              </p>
              <h3
                className="font-[family-name:var(--font-display)]"
                style={{
                  fontSize: '14px',
                  fontWeight: 300,
                  color: '#F0EDE8',
                  marginBottom: '12px',
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  fontSize: '11px',
                  lineHeight: 1.9,
                  color: '#686560',
                }}
              >
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── REVIEWS ── */}
      <section
        className="px-6 md:px-16"
        style={{ paddingTop: '48px', paddingBottom: '56px' }}
      >
        <div className="flex items-baseline gap-6 mb-10">
          <p style={{ fontSize: '9px', letterSpacing: '0.5em', textTransform: 'uppercase', color: '#686560' }}>
            Reseñas
          </p>
          <span style={{ fontSize: '11px', color: '#81807F', letterSpacing: '0.05em' }}>
            ★★★★★ <span style={{ color: '#505050' }}>5.0</span>
          </span>
        </div>

        {/* Mobile: horizontal scroll / Desktop: 2-col grid */}
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none md:grid md:grid-cols-2 md:overflow-visible md:pb-0 max-w-3xl">
          {REVIEWS.map((r) => (
            <div
              key={r.name}
              className="shrink-0 w-[78vw] md:w-auto"
              style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                paddingTop: '24px',
                paddingBottom: '24px',
              }}
            >
              <p style={{ fontSize: '9px', letterSpacing: '0.2em', color: '#81807F', marginBottom: '14px' }}>
                ★★★★★
              </p>
              <p style={{ fontSize: '12px', lineHeight: 1.9, color: '#8A8582', fontWeight: 300, marginBottom: '20px' }}>
                &ldquo;{r.text}&rdquo;
              </p>
              <p className="font-[family-name:var(--font-display)]" style={{ fontSize: '12px', color: '#F0EDE8', fontWeight: 300 }}>
                {r.name}
              </p>
              <p style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#505050', marginTop: '4px' }}>
                {r.service}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOURS ── */}
      <section
        className="px-6 md:px-16"
        style={{ paddingBottom: '40px' }}
      >
        <div style={{ maxWidth: '360px' }}>
          <p
            style={{
              fontSize: '9px',
              letterSpacing: '0.5em',
              textTransform: 'uppercase',
              color: '#686560',
              marginBottom: '28px',
            }}
          >
            Horarios
          </p>

          <div>
            {HOURS.map((h, i) => (
              <div
                key={h.days}
                className="flex items-baseline justify-between"
                style={{
                  paddingTop: '10px',
                  paddingBottom: '10px',
                  borderTop: i === 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 300, color: '#686560' }}>
                  {h.days}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 300,
                    marginLeft: '32px',
                    flexShrink: 0,
                    color: h.time === 'Cerrado' ? '#505050' : '#81807F',
                  }}
                >
                  {h.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LOCATION MAP ── */}
      <section
        className="px-6 md:px-16"
        style={{ paddingBottom: '56px' }}
      >
        <p
          style={{
            fontSize: '9px',
            letterSpacing: '0.5em',
            textTransform: 'uppercase',
            color: '#686560',
            marginBottom: '6px',
          }}
        >
          Ubicación
        </p>
        <p style={{ fontSize: '12px', fontWeight: 300, color: '#505050', marginBottom: '20px' }}>
          Plaza A2, piso 3, local 3D — Mazatlán, Sin.
        </p>
        <div style={{ maxWidth: '480px', overflow: 'hidden' }}>
          <iframe
            title="Ubicación Daniela Palacio Hair Room"
            src="https://maps.google.com/maps?q=Plaza+A2+Mazatlan+Sinaloa+Mexico&t=&z=16&ie=UTF8&iwloc=&output=embed"
            width="100%"
            height="240"
            style={{ border: 0, display: 'block', filter: 'grayscale(1) invert(1) brightness(0.85)' }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <a
          href="https://maps.google.com/maps?q=Plaza+A2+Mazatlan+Sinaloa+Mexico"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#686560', marginTop: '12px', display: 'inline-block' }}
          className="hover:text-[#81807F] transition-colors"
        >
          Cómo llegar →
        </a>
      </section>

      {/* ── INSTAGRAM CTA ── */}
      <section
        className="px-6 md:px-16"
        style={{ paddingBottom: '40px' }}
      >
        <a
          href="https://instagram.com/danielapalaciosalon"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 hover:opacity-[0.35] transition-opacity duration-200"
          style={{ color: '#686560' }}
        >
          <InstagramIcon size={12} />
          <span
            style={{
              fontSize: '11px',
              letterSpacing: '0.12em',
              color: '#686560',
            }}
          >
            @danielapalaciosalon
          </span>
        </a>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="px-6 md:px-16 flex items-end justify-between gap-6 flex-wrap"
        style={{
          paddingTop: '40px',
          paddingBottom: '40px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <div className="flex flex-col gap-3">
          <Image
            src="/logos/logo-largo.png"
            alt="Daniela Palacio"
            width={140}
            height={26}
            style={{ filter: 'brightness(0) invert(1)', opacity: 0.35, width: '140px', height: 'auto' }}
          />
          <p style={{ fontSize: '10px', color: '#505050', letterSpacing: '0.1em' }}>
            Plaza A2, piso 3, local 3D — Mazatlán, Sin.
          </p>
          <p style={{ fontSize: '10px', color: '#505050', letterSpacing: '0.1em' }}>
            © 2025 Daniela Palacio Hair Room
          </p>
        </div>

        <div className="flex flex-col items-end gap-3">
          <Image
            src="/logos/symbol-x.png"
            alt=""
            width={28}
            height={28}
            style={{ filter: 'brightness(0) invert(1)', opacity: 0.18, width: '28px', height: '28px' }}
          />
          <a
            href="https://wa.me/526691877077"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-50 transition-opacity duration-200"
            style={{
              fontSize: '10px',
              letterSpacing: '0.25em',
              color: '#686560',
              textTransform: 'uppercase',
            }}
          >
            WhatsApp →
          </a>
        </div>
      </footer>

    </main>
  );
}
