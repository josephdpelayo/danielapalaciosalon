'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { InstagramIcon } from '@/components/icons';
import { formatDuration, formatPrice } from '@/lib/slots';
import { MOCK_SERVICES } from '@/lib/mock-data';
import type { Service } from '@/lib/types';


const HOURS = [
  { days: 'Lunes — Viernes', time: '10:00 am — 7:00 pm' },
  { days: 'Sábado',          time: '10:00 am — 3:00 pm'  },
  { days: 'Domingo',         time: 'Cerrado'              },
];


const REVIEWS = [
  { name: 'Fernanda R.',  service: 'Balayage',           text: 'El mejor balayage que me han hecho. Daniela entendió exactamente lo que quería desde la primera consulta.' },
  { name: 'Sofía M.',     service: 'Hair color',          text: 'Mi cabello quedó súper saludable y con un color hermoso. El ambiente del estudio es increíble.' },
  { name: 'Valeria T.',   service: 'Corte + tratamiento', text: 'Puntual, profesional y con una técnica impecable. Ya agendé mi próxima cita.' },
  { name: 'Mariana L.',   service: 'Mechas',              text: 'Llevaba meses sin hacerme nada y Daniela transformó mi cabello completamente. 100% recomendada.' },
];

function BokiLeadCapture() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await fetch('https://boki.mx/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, from_slug: 'danielapalacio' }),
      });
    } catch {}
    setDone(true);
    setLoading(false);
  }

  return (
    <section style={{
      background: '#0D0E10',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      padding: '52px 24px',
      textAlign: 'center',
    }}>
      <p style={{ fontSize: '9px', letterSpacing: '0.5em', textTransform: 'uppercase', color: '#505050', marginBottom: '10px' }}>
        reservas por
      </p>
      <p style={{ fontSize: '14px', letterSpacing: '0.35em', color: '#888884', marginBottom: '32px', fontWeight: 300 }}>
        boki.mx
      </p>

      {done ? (
        <p style={{ fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#686560' }}>
          te avisamos pronto
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: '340px', margin: '0 auto' }}
        >
          <input
            type="email"
            required
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.12)',
              padding: '10px 0',
              fontSize: '11px',
              letterSpacing: '0.1em',
              color: '#A0A09C',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.12)',
              padding: '10px 0 10px 20px',
              fontSize: '9px',
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              color: loading ? '#404040' : '#686560',
              cursor: loading ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color 0.2s',
            }}
          >
            {loading ? '...' : 'Quiero la mía →'}
          </button>
        </form>
      )}
    </section>
  );
}

export default function Home() {
  const [services, setServices] = useState<Service[]>(MOCK_SERVICES);

  useEffect(() => {
    fetch('/api/services')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.services?.length) setServices(data.services); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } }),
      { threshold: 0.07 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <main
      style={{ background: '#16181E', color: '#F0EDE8', fontFamily: 'var(--font-body)' }}
      className="overflow-x-hidden"
    >

      {/* ── NAV ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: 'rgba(16,18,20,0.93)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        {/* Main bar */}
        <div className="flex items-center justify-between px-6 md:px-16" style={{ paddingTop: '18px', paddingBottom: '18px' }}>
          <Image
            src="/logos/logo-largo.png"
            alt="Daniela Palacio"
            width={180}
            height={34}
            style={{ filter: 'brightness(0) invert(1)', opacity: 0.85, width: '160px', height: 'auto' }}
            priority
          />
          {/* Anchor links — desktop */}
          <div className="hidden md:flex items-center gap-8">
            {[
              { href: '#daniela',   label: 'Daniela'   },
              { href: '#servicios', label: 'Servicios' },
              { href: '#resenas',   label: 'Reseñas'   },
              { href: '#horarios',  label: 'Dirección' },
            ].map(({ href, label }) => (
              <a key={href} href={href}
                style={{ fontSize: '9px', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#686560', transition: 'color 0.2s' }}
                className="hover:text-[#81807F]"
              >{label}</a>
            ))}
          </div>
          <Link href="/reservar"
            style={{ color: '#F0EDE8', fontSize: '10px', letterSpacing: '0.35em', textTransform: 'uppercase', fontWeight: 300, transition: 'opacity 0.2s' }}
            className="hover:opacity-50"
          >
            Reservar
          </Link>
        </div>
        {/* Mobile anchor links — horizontal scroll */}
        <div className="flex md:hidden overflow-x-auto scrollbar-none px-6 pb-3 gap-7">
          {[
            { href: '#daniela',   label: 'Daniela'   },
            { href: '#servicios', label: 'Servicios' },
            { href: '#resenas',   label: 'Reseñas'   },
            { href: '#horarios',  label: 'Dirección' },
          ].map(({ href, label }) => (
            <a key={href} href={href}
              style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#686560', whiteSpace: 'nowrap', flexShrink: 0 }}
            >{label}</a>
          ))}
        </div>
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

        {/* Instagram — esquina inferior izquierda del hero */}
        <a
          href="https://instagram.com/danielapalaciosalon"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-20 left-6 hover:opacity-60 transition-opacity duration-200 flex items-center justify-center"
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            border: '1px solid rgba(240,237,232,0.28)',
            color: 'rgba(240,237,232,0.55)',
            zIndex: 10,
          }}
        >
          <InstagramIcon size={14} />
        </a>

        {/* WhatsApp — esquina inferior derecha del hero */}
        <a
          href={`https://wa.me/${process.env.NEXT_PUBLIC_SALON_WHATSAPP ?? '526691877077'}`}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-20 right-6 hover:opacity-60 transition-opacity duration-200 flex items-center justify-center"
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            border: '1px solid rgba(240,237,232,0.28)',
            fontSize: '9px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(240,237,232,0.55)',
            fontWeight: 300,
            zIndex: 10,
          }}
        >
          WA
        </a>
      </section>

      {/* ── MEET DANIELA ── */}
      <section
        id="daniela"
        data-reveal
        className="px-6 md:px-16"
        style={{ paddingTop: '56px', paddingBottom: '64px', borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        <p style={{ fontSize: '9px', letterSpacing: '0.5em', textTransform: 'uppercase', color: '#686560', marginBottom: '40px' }}>
          La estilista
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-start max-w-4xl">
          {/* Photo */}
          <div style={{ position: 'relative', aspectRatio: '3/4', overflow: 'hidden' }}>
            <Image
              src="/gallery/daniela-portrait.png"
              alt="Daniela Palacio — estilista"
              fill
              className="object-cover"
              style={{ objectPosition: '35% 8%', filter: 'brightness(0.96) contrast(1.04) saturate(0.92)' }}
            />
          </div>

          {/* Text */}
          <div className="flex flex-col justify-center" style={{ paddingTop: '8px' }}>
            <h2
              className="font-[family-name:var(--font-display)]"
              style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 300, color: '#F0EDE8', lineHeight: 1.15, marginBottom: '8px' }}
            >
              Daniela Palacio
            </h2>
            <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#686560', marginBottom: '32px' }}>
              Estilista de cabello · Mazatlán, Sin.
            </p>
            <p style={{ fontSize: '13px', lineHeight: 2, color: '#606060', fontWeight: 300, marginBottom: '20px' }}>
              Soy Daniela, estilista especializada en color y cuidado capilar con base en Mazatlán, Sinaloa. Cada técnica que aplico parte de un principio: el cabello saludable es el mejor punto de partida para cualquier transformación.
            </p>
            <p style={{ fontSize: '13px', lineHeight: 2, color: '#606060', fontWeight: 300 }}>
              Me especializo en color — balayage, mechas y tratamientos — con un enfoque personalizado en cada clienta. Porque no hay dos cabellos iguales, y el resultado que buscas merece atención real.
            </p>
          </div>
        </div>
      </section>

      {/* ── EL ESTUDIO ── */}
      <section
        data-reveal
        className="px-6 md:px-16"
        style={{ paddingTop: '56px', paddingBottom: '80px', borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        {/* Label */}
        <p style={{ fontSize: '9px', letterSpacing: '0.5em', textTransform: 'uppercase', color: '#686560', marginBottom: '20px' }}>
          El estudio
        </p>

        {/* Title */}
        <h2
          className="font-[family-name:var(--font-display)]"
          style={{ fontSize: 'clamp(36px, 7vw, 72px)', fontWeight: 300, color: '#F0EDE8', lineHeight: 1.05, marginBottom: '28px', maxWidth: '640px' }}
        >
          Un espacio para ti.
        </h2>

        {/* Description */}
        <p style={{ fontSize: '13px', lineHeight: 2, color: '#606060', maxWidth: '400px', fontWeight: 300, marginBottom: '56px' }}>
          Un ambiente íntimo donde cada visita es una experiencia. Aquí el cuidado va primero — sin prisa, sin ruido. Solo tú y tu cabello.
        </p>

        {/* Staggered photos */}
        <div style={{ maxWidth: '560px', position: 'relative' }}>
          {/* Photo 1 — left */}
          <div style={{ width: '63%', aspectRatio: '3/4', position: 'relative', overflow: 'hidden' }}>
            <Image src="/gallery/estudio-3.jpg" alt="El estudio" fill className="object-cover" style={{ filter: 'brightness(0.92) contrast(1.04) saturate(0.88)' }} />
          </div>
          {/* Photo 2 — right, offset down */}
          <div style={{ width: '56%', aspectRatio: '3/4', position: 'relative', overflow: 'hidden', marginLeft: 'auto', marginTop: '-38%' }}>
            <Image src="/gallery/estudio-2.jpg" alt="El estudio" fill className="object-cover object-top" style={{ filter: 'brightness(0.92) contrast(1.04) saturate(0.88)' }} />
          </div>
          {/* Photo 3 — left, offset down */}
          <div style={{ width: '48%', aspectRatio: '3/4', position: 'relative', overflow: 'hidden', marginTop: '-28%' }}>
            <Image src="/gallery/estudio-1.jpg" alt="El estudio" fill className="object-cover" style={{ filter: 'brightness(0.92) contrast(1.04) saturate(0.88)' }} />
          </div>
        </div>
      </section>


      {/* ── SERVICES ── */}
      <section
        id="servicios"
        data-reveal
        className="px-6 md:px-16"
        style={{ paddingTop: '40px', paddingBottom: '40px', borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div className="max-w-3xl">
          <p
            style={{
              fontSize: '9px',
              letterSpacing: '0.5em',
              textTransform: 'uppercase',
              color: '#686560',
              marginBottom: '28px',
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
              <div key={cat} style={{ marginBottom: '20px' }}>
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
                    const href = `/reservar?service=${service.id}`;
                    const linkProps = {};

                    return (
                      <Link
                        key={service.id}
                        href={href}
                        {...linkProps}
                        className="group flex items-baseline justify-between"
                        style={{
                          paddingTop: '12px',
                          paddingBottom: '12px',
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
                            className="transition-all duration-200 group-hover:opacity-70"
                            style={{ fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#686560', border: '1px solid rgba(255,255,255,0.1)', padding: '5px 10px', whiteSpace: 'nowrap' }}
                          >
                            Reservar
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

      {/* ── REVIEWS ── */}
      <section
        id="resenas"
        data-reveal
        className="px-6 md:px-16"
        style={{ paddingTop: '56px', paddingBottom: '56px', borderTop: '1px solid rgba(255,255,255,0.04)' }}
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

      {/* ── UBICACIÓN + HORARIOS ── */}
      <section
        id="horarios"
        data-reveal
        className="px-6 md:px-16"
        style={{ paddingTop: '28px', paddingBottom: '28px', borderTop: '1px solid rgba(255,255,255,0.04)', scrollMarginTop: '64px' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 max-w-4xl">

          {/* Horarios */}
          <div>
            <p style={{ fontSize: '9px', letterSpacing: '0.5em', textTransform: 'uppercase', color: '#686560', marginBottom: '16px' }}>
              Horarios
            </p>
            <div>
              {HOURS.map((h, i) => (
                <div
                  key={h.days}
                  className="flex items-baseline justify-between"
                  style={{
                    paddingTop: '7px',
                    paddingBottom: '7px',
                    borderTop: i === 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 300, color: '#686560' }}>{h.days}</span>
                  <span style={{ fontSize: '12px', fontWeight: 300, marginLeft: '32px', flexShrink: 0, color: h.time === 'Cerrado' ? '#505050' : '#81807F' }}>
                    {h.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Ubicación */}
          <div>
            <p style={{ fontSize: '9px', letterSpacing: '0.5em', textTransform: 'uppercase', color: '#686560', marginBottom: '6px' }}>
              Ubicación
            </p>
            <p style={{ fontSize: '12px', fontWeight: 300, color: '#505050', marginBottom: '12px' }}>
              Plaza A2, piso 3, local 3D — Mazatlán, Sin.
            </p>
            <div style={{ overflow: 'hidden' }}>
              <iframe
                title="Ubicación Daniela Palacio Hair Room"
                src="https://maps.google.com/maps?q=Plaza+A2+Mazatlan+Sinaloa+Mexico&t=&z=16&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="130"
                style={{ border: 0, display: 'block', filter: 'brightness(0.72) saturate(0.6) contrast(1.0)' }}
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
          </div>

        </div>
      </section>

      {/* ── INSTAGRAM ── */}
      <section
        data-reveal
        className="px-6 md:px-16"
        style={{ paddingTop: '28px', paddingBottom: '32px', borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        <p style={{ fontSize: '9px', letterSpacing: '0.5em', textTransform: 'uppercase', color: '#686560', marginBottom: '16px' }}>
          Síguenos
        </p>
        <a
          href="https://instagram.com/danielapalaciosalon"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-4 w-fit"
        >
          <InstagramIcon size={18} className="text-[#81807F]" />
          <span
            className="font-[family-name:var(--font-display)] group-hover:opacity-50 transition-opacity duration-300"
            style={{ fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 300, color: '#F0EDE8', letterSpacing: '-0.01em' }}
          >
            @danielapalaciosalon
          </span>
        </a>
      </section>

      {/* ── CTA CIERRE ── */}
      <section
        data-reveal
        className="px-6 md:px-16 flex flex-col items-center text-center"
        style={{ paddingTop: '96px', paddingBottom: '96px', borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        <Image
          src="/logos/symbol-x.png"
          alt=""
          width={24}
          height={24}
          style={{ filter: 'brightness(0) invert(1)', opacity: 0.12, width: '24px', height: '24px', marginBottom: '40px' }}
        />
        <h2
          className="font-[family-name:var(--font-display)]"
          style={{ fontSize: 'clamp(32px, 6vw, 60px)', fontWeight: 300, color: '#F0EDE8', lineHeight: 1.1, marginBottom: '16px', letterSpacing: '-0.01em' }}
        >
          Tu cabello merece atención real.
        </h2>
        <p style={{ fontSize: '11px', letterSpacing: '0.4em', textTransform: 'uppercase', color: '#686560', marginBottom: '48px' }}>
          cuidado que transforma
        </p>
        <Link
          href="/reservar"
          style={{
            display: 'inline-block',
            background: '#F0EDE8',
            color: '#16181E',
            fontSize: '10px',
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            fontWeight: 400,
            padding: '16px 48px',
            transition: 'opacity 0.2s',
          }}
          className="hover:opacity-75"
        >
          Reservar cita
        </Link>
      </section>

      {/* ── BOKI ── */}
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
            href={`https://wa.me/${process.env.NEXT_PUBLIC_SALON_WHATSAPP ?? '526691877077'}`}
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

      <BokiLeadCapture />

    </main>
  );
}
