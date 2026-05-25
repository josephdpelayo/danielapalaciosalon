'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { format, addDays, isBefore, startOfToday, getDay, parseISO } from 'date-fns';
import { ArrowLeft, ArrowRight, Check, Scissors, Calendar, User, CreditCard } from 'lucide-react';
import { MOCK_SERVICES, MOCK_SCHEDULE } from '@/lib/mock-data';
import { Service, TimeSlot } from '@/lib/types';
import { formatTime, formatDuration, formatPrice } from '@/lib/slots';
import 'react-day-picker/dist/style.css';

type Step = 'info' | 'service' | 'date' | 'time' | 'confirm';
const STEPS_LIST: Step[] = ['info', 'service', 'date', 'time', 'confirm'];

function svcDotColor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('corte') && !n.includes('tinte')) return '#81807F';
  if (n.includes('color') && !n.includes('tinte')) return '#A09F9E';
  if (n.includes('mecha') || n.includes('balayage')) return '#605856';
  if (n.includes('retoque')) return '#81807F';
  if (n.includes('antifrizz') || n.includes('brazilian') || n.includes('brasi')) return '#504C4C';
  if (n.includes('tinte')) return '#A09F9E';
  if (n.includes('peinado')) return '#81807F';
  return '#81807F';
}

function BookingContent() {
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>('info');
  const [services, setServices] = useState<Service[]>(MOCK_SERVICES);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone]   = useState('');
  const [countryCode, setCountryCode]   = useState('+52');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduleList, setScheduleList] = useState(MOCK_SCHEDULE);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [isTrusted, setIsTrusted] = useState(false);
  const [trustedName, setTrustedName] = useState<string | null>(null);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    MOCK_SERVICES.find(s => s.category)?.category ?? ''
  );
  const [nextAvailable, setNextAvailable] = useState<string | null>(null);
  const [loadingNext, setLoadingNext] = useState(false);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistDone, setWaitlistDone] = useState(false);

  useEffect(() => {
    fetch('/api/services')
      .then((r) => r.json())
      .then((d) => {
        if (d.services?.length) {
          setServices(d.services);
          const firstCat = d.services.find((s: Service) => s.category)?.category;
          if (firstCat) setSelectedCategory(firstCat);
        }
      })
      .catch(() => {});
    fetch('/api/schedule')
      .then((r) => r.json())
      .then((d) => { if (d.schedule?.length) setScheduleList(d.schedule); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const sid = searchParams.get('service');
    if (sid) {
      const svc = services.find((s) => s.id === sid);
      if (svc) { setSelectedService(svc); setStep('info'); }
    }
  }, [searchParams, services]);

  useEffect(() => {
    if (!selectedDate || !selectedService) { setSlots([]); return; }
    setLoadingSlots(true);
    const dow = getDay(selectedDate);
    const daySchedule = scheduleList.find((s) => s.day_of_week === dow);
    if (!daySchedule || !daySchedule.is_active) { setSlots([]); setLoadingSlots(false); return; }

    setNextAvailable(null);
    setShowWaitlist(false);
    setWaitlistDone(false);
    fetch(`/api/available-slots?date=${format(selectedDate, 'yyyy-MM-dd')}&service_id=${selectedService.id}&duration=${selectedService.duration_minutes}&active_minutes=${selectedService.active_minutes}`)
      .then((r) => r.json())
      .then((data) => {
        const fetchedSlots = data.slots || [];
        setSlots(fetchedSlots);
        if (fetchedSlots.length === 0) {
          setLoadingNext(true);
          fetch(`/api/next-available?service_id=${selectedService.id}&after=${format(selectedDate, 'yyyy-MM-dd')}`)
            .then((r) => r.json())
            .then((d) => setNextAvailable(d.date ?? null))
            .finally(() => setLoadingNext(false));
        }
      })
      .catch(() => { setSlots([]); setLoadingSlots(false); })
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, selectedService]);

  const isDisabledDay = (date: Date) => {
    if (isBefore(date, startOfToday())) return true;
    const dow = getDay(date);
    const daySchedule = scheduleList.find((s) => s.day_of_week === dow);
    return !daySchedule?.is_active;
  };

  const checkTrustedPhone = async (phone: string) => {
    const full = countryCode + phone;
    if (full.replace(/\D/g, '').length < 8) { setIsTrusted(false); setTrustedName(null); return; }
    setCheckingPhone(true);
    try {
      const res = await fetch(`/api/trusted-check?phone=${encodeURIComponent(full)}`);
      const data = await res.json();
      setIsTrusted(data.trusted);
      setTrustedName(data.trusted ? data.client?.name ?? null : null);
      if (data.trusted && data.client?.name) setClientName(data.client.name);
      if (data.trusted && data.client?.email && !clientEmail) setClientEmail(data.client.email);
    } catch { setIsTrusted(false); }
    finally { setCheckingPhone(false); }
  };

  const handlePay = async () => {
    if (!selectedService || !selectedDate || !selectedSlot) return;
    setSubmitting(true);
    setBookingError('');
    try {
      // 1. Create appointment
      const apptRes = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: selectedService.id,
          client_name: clientName,
          client_phone: countryCode + clientPhone,
          client_email: clientEmail || null,
          appointment_date: format(selectedDate, 'yyyy-MM-dd'),
          start_time: selectedSlot.start,
          end_time: selectedSlot.end,
          notes: notes || null,
          deposit_amount: selectedService.deposit_amount,
        }),
      });
      const appt = await apptRes.json();
      if (!apptRes.ok) throw new Error(appt.error);

      // 2. Trusted client — confirm directly, no payment
      if (isTrusted) {
        await fetch('/api/admin', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: appt.id, status: 'confirmed' }),
        });
        window.location.href = `/reservar/exito?id=${appt.id}&trusted=1`;
        return;
      }

      // 3. Create MercadoPago preference
      const payRes = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: appt.id,
          service_name: selectedService.name,
          deposit_amount: selectedService.deposit_amount,
          client_name: clientName,
          client_email: clientEmail || null,
          appointment_date: format(selectedDate, "d 'de' MMMM", { locale: es }),
          start_time: formatTime(selectedSlot.start),
        }),
      });

      if (payRes.ok) {
        const pay = await payRes.json();
        window.location.href = pay.init_point;
      } else {
        const params = new URLSearchParams({
          id: appt.id,
          amount: String(selectedService.deposit_amount),
          service: selectedService.name,
          date: format(selectedDate, "d 'de' MMMM", { locale: es }),
          time: formatTime(selectedSlot.start),
        });
        window.location.href = `/reservar/pagar?${params}`;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      setBookingError(
        msg.includes('disponible')
          ? msg
          : 'Hubo un error al procesar tu solicitud. Por favor intenta de nuevo o contáctanos por WhatsApp.'
      );
      setSubmitting(false);
    }
  };

  const stepIndex = STEPS_LIST.indexOf(step);

  // Step label map for progress dots aria
  const stepLabels: Record<Step, string> = {
    info: 'Datos',
    service: 'Servicio',
    date: 'Fecha',
    time: 'Horario',
    confirm: 'Confirmar',
  };

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>

      {/* Header */}
      <div className="border-b border-white/8 px-5 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-[#666] hover:text-[#81807F] transition-colors text-sm">
          <ArrowLeft size={15} />
          <span className="hidden sm:inline tracking-wider">Volver</span>
        </Link>
        <div className="font-[family-name:var(--font-display)] text-xs tracking-[0.28em] uppercase text-[#81807F]">
          Daniela Palacio
        </div>
        <div className="w-10 sm:w-20" />
      </div>

      {/* Progress — thin line + 5 dots + current label */}
      <div className="px-5 pt-3 pb-2 max-w-xl mx-auto">
        <div className="relative flex items-center mb-2">
          <div className="absolute left-0 right-0 h-px bg-white/8" />
          <div
            className="absolute left-0 h-px bg-[#81807F] transition-all duration-500"
            style={{ width: stepIndex === 0 ? '0%' : `${(stepIndex / (STEPS_LIST.length - 1)) * 100}%` }}
          />
          <div className="relative w-full flex justify-between">
            {STEPS_LIST.map((s, i) => {
              const isPast = i < stepIndex;
              const isCurrent = i === stepIndex;
              return (
                <div key={s} className={`${isCurrent ? 'w-3 h-3' : 'w-2 h-2'} rounded-full border transition-all duration-300 shrink-0`}
                  style={{
                    background: isPast || isCurrent ? '#81807F' : 'transparent',
                    borderColor: isPast || isCurrent ? '#81807F' : 'rgba(255,255,255,0.2)',
                    boxShadow: isCurrent ? '0 0 0 3px rgba(129,128,127,0.15)' : 'none',
                  }}
                />
              );
            })}
          </div>
        </div>
        {/* Current step label + counter */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] tracking-[0.2em] uppercase text-[#81807F]">
            {stepLabels[step]}
          </span>
          <span className="text-[10px] text-white/20 tracking-wider">
            {stepIndex + 1} / {STEPS_LIST.length}
          </span>
        </div>
      </div>

      <div className="px-5 pb-8 max-w-xl mx-auto">

        {/* ─── STEP 1: INFO ─── */}
        {step === 'info' && (
          <div>
            <div className="mb-4">
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-light text-[#F0EDE8] leading-tight mb-1">
                Cuéntame de ti
              </h2>
              <p className="text-[#666] text-xs tracking-[0.1em] uppercase">
                Ingresa tus datos para comenzar
              </p>
            </div>

            <div className="space-y-4">

              {/* Name */}
              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase text-[#666] mb-1.5">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full bg-transparent border border-white/10 text-[#F0EDE8] px-4 py-2.5 focus:outline-none focus:border-[#81807F]/60 transition-colors placeholder:text-white/20" style={{ fontSize: '16px' }}
                />
              </div>

              {/* Phone with +52 prefix */}
              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase text-[#666] mb-1.5">
                  WhatsApp *
                </label>
                <div className={`flex border transition-colors ${isTrusted ? 'border-[#81807F]/60' : 'border-white/10 focus-within:border-[#81807F]/60'}`}>
                  <input
                    type="text"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    maxLength={5}
                    className="bg-transparent border-r border-white/10 text-[#666] focus:outline-none focus:text-[#A09F9E] text-center"
                    style={{ width: '52px', fontSize: '14px', padding: '0 8px' }}
                  />
                  <div className="flex-1 relative">
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={clientPhone}
                      maxLength={10}
                      onChange={(e) => { setClientPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setIsTrusted(false); setTrustedName(null); }}
                      onBlur={(e) => checkTrustedPhone(e.target.value)}
                      placeholder="669 123 4567"
                      className="flex-1 w-full bg-transparent px-3 py-2.5 text-white focus:outline-none placeholder:text-white/20"
                      style={{ fontSize: '16px' }}
                    />
                    {checkingPhone && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border border-[#81807F] border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                </div>
                {isTrusted && (
                  <div className="mt-2">
                    <div className="w-5 h-5 rounded-full bg-[#81807F] flex items-center justify-center">
                      <Check size={11} className="text-black" strokeWidth={2.5} />
                    </div>
                  </div>
                )}
              </div>

              {/* Email optional */}
              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase text-[#666] mb-1.5">
                  Correo electrónico <span className="normal-case tracking-normal text-[#444]">— opcional</span>
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full bg-transparent border border-white/10 text-[#F0EDE8] px-4 py-2.5 focus:outline-none focus:border-[#81807F]/60 transition-colors placeholder:text-white/20" style={{ fontSize: '16px' }}
                />
              </div>

              {/* Notes optional */}
              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase text-[#666] mb-1.5">
                  Notas <span className="normal-case tracking-normal text-[#444]">— opcional</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Longitud de cabello, alergias, referencias de color..."
                  rows={2}
                  className="w-full bg-transparent border border-white/10 text-[#F0EDE8] px-4 py-2.5 focus:outline-none focus:border-[#81807F]/60 transition-colors placeholder:text-white/20 resize-none"
                  style={{ fontSize: '16px' }}
                />
              </div>

              <div>
                <button
                  disabled={!clientName.trim() || !clientPhone.trim()}
                  onClick={() => setStep(selectedService ? 'date' : 'service')}
                  className="w-full flex items-center justify-center gap-3 bg-[#F0EDE8] text-[#16181E] py-3 text-[11px] tracking-[0.25em] uppercase font-semibold hover:bg-[#E0DBD4] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Continuar <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 2: SERVICE ─── */}
        {step === 'service' && (() => {
          const categories = [...new Set(
            services.filter(s => s.active && s.category).map(s => s.category as string)
          )];
          const visibleServices = services.filter(s => s.active && s.category === selectedCategory);
          return (
            <div>
              <div className="mb-4">
                <button
                  onClick={() => setStep('info')}
                  className="flex items-center gap-2 text-[#666] hover:text-[#81807F] transition-colors text-xs tracking-wider mb-3"
                >
                  <ArrowLeft size={13} /> Atrás
                </button>
                <h2 className="font-[family-name:var(--font-display)] text-3xl font-light text-[#F0EDE8] leading-tight mb-1">
                  Elige un servicio
                </h2>
                <p className="text-[#666] text-xs tracking-[0.1em] uppercase">
                  Selecciona el tratamiento que deseas
                </p>
              </div>

              {/* Category pills — centered */}
              <div className="flex justify-center gap-6 pb-1 mb-4 overflow-x-auto scrollbar-none">
                {categories.map((cat) => {
                  const active = cat === selectedCategory;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className="shrink-0 text-xs tracking-[0.15em] uppercase transition-colors whitespace-nowrap pb-2"
                      style={active
                        ? { color: '#F0EDE8', borderBottom: '1px solid #81807F' }
                        : { color: '#444' }
                      }
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Services — same original style */}
              <div className="divide-y divide-white/8">
                {visibleServices.map((svc) => (
                  <button
                    key={svc.id}
                    onClick={() => { setSelectedService(svc); setSelectedDate(undefined); setSelectedSlot(null); setStep('date'); }}
                    className="w-full text-left py-4 hover:bg-white/[0.02] transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="inline-block w-2 h-2 rounded-full shrink-0"
                            style={{ background: svcDotColor(svc.name) }}
                          />
                          <span className="text-[#F0EDE8] text-sm font-medium group-hover:text-white transition-colors">
                            {svc.name}
                          </span>
                          <span className="text-[10px] text-[#81807F] tracking-[0.15em] uppercase">
                            {formatPrice(svc.price)}
                          </span>
                        </div>
                        <p className="text-[#666] text-xs leading-relaxed">{svc.description}</p>
                        <p className="text-[#444] text-[10px] mt-2 tracking-[0.1em] uppercase">{formatDuration(svc.duration_minutes)}</p>
                      </div>
                      <ArrowRight size={14} className="text-[#333] group-hover:text-[#81807F] transition-colors mt-1 shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ─── STEP 3: DATE ─── */}
        {step === 'date' && selectedService && (
          <div>
            <div className="mb-4">
              <button
                onClick={() => setStep('service')}
                className="flex items-center gap-2 text-[#666] hover:text-[#81807F] transition-colors text-xs tracking-wider mb-3"
              >
                <ArrowLeft size={13} /> Atrás
              </button>
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-light text-[#F0EDE8] leading-tight mb-1">
                Elige una fecha
              </h2>
              <div className="flex items-center gap-3">
                <p className="text-[#666] text-xs tracking-[0.1em] uppercase">
                  {selectedService.name} · {formatDuration(selectedService.duration_minutes)}
                </p>
                <button
                  onClick={() => setStep('service')}
                  className="text-[10px] text-[#81807F] border border-white/10 px-2 py-1 hover:border-[#81807F]/40 transition-colors tracking-wider uppercase"
                >
                  Cambiar
                </button>
              </div>
            </div>

            <div className="border border-white/8 flex justify-center py-2 overflow-x-auto">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={es}
                disabled={isDisabledDay}
                startMonth={startOfToday()}
                endMonth={addDays(startOfToday(), 60)}
                modifiersStyles={{
                  selected: { backgroundColor: 'transparent', color: '#F0EDE8', fontWeight: '700', outline: 'none', boxShadow: 'none' },
                  today: { color: '#81807F', fontWeight: '600' },
                }}
                styles={{
                  day: { color: '#F0EDE8', borderRadius: '0', minWidth: '40px', minHeight: '40px' },
                  caption_label: { color: '#F0EDE8', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' },
                  weekday: { color: '#666', textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '0.15em' },
                  root: { background: 'transparent' },
                  month: { width: '100%' },
                }}
              />
            </div>

            {selectedDate && (
              <div className="mt-8">
                <button
                  onClick={() => setStep('time')}
                  className="w-full flex items-center justify-center gap-3 bg-[#F0EDE8] text-[#16181E] py-4 text-[11px] tracking-[0.25em] uppercase font-semibold hover:bg-[#E0DBD4] transition-colors"
                >
                  Ver horarios <ArrowRight size={13} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 4: TIME ─── */}
        {step === 'time' && selectedService && selectedDate && (
          <div>
            <div className="mb-4">
              <button
                onClick={() => setStep('date')}
                className="flex items-center gap-2 text-[#666] hover:text-[#81807F] transition-colors text-xs tracking-wider mb-3"
              >
                <ArrowLeft size={13} /> Atrás
              </button>
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-light text-[#F0EDE8] leading-tight mb-3">
                Elige un horario
              </h2>
              {/* Day navigation */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    const prev = addDays(selectedDate, -1);
                    if (!isBefore(prev, startOfToday())) { setSelectedDate(prev); setSelectedSlot(null); }
                  }}
                  disabled={isBefore(addDays(selectedDate, -1), startOfToday())}
                  className="text-[#666] hover:text-[#F0EDE8] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowLeft size={14} />
                </button>
                <p className="text-[#81807F] text-xs tracking-[0.12em] uppercase capitalize flex-1 text-center">
                  {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                </p>
                <button
                  onClick={() => {
                    const next = addDays(selectedDate, 1);
                    if (!isBefore(addDays(startOfToday(), 60), next)) { setSelectedDate(next); setSelectedSlot(null); }
                  }}
                  disabled={!isBefore(addDays(selectedDate, 1), addDays(startOfToday(), 61))}
                  className="text-[#666] hover:text-[#F0EDE8] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {loadingSlots ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-5 h-5 border border-[#81807F] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : slots.length === 0 ? (
              <div className="border border-white/8 px-5 py-8 text-center">
                <p className="text-[#666] text-sm mb-5">No hay disponibilidad para este día.</p>

                {/* Siguiente fecha disponible */}
                {loadingNext ? (
                  <p className="text-[#444] text-xs tracking-wider mb-5">Buscando próxima fecha disponible…</p>
                ) : nextAvailable ? (
                  <button
                    onClick={() => { setSelectedDate(parseISO(nextAvailable)); setSelectedSlot(null); }}
                    className="w-full flex items-center justify-center gap-2 border border-[#81807F]/40 text-[#81807F] py-3 text-xs tracking-[0.15em] uppercase hover:border-[#81807F] transition-colors mb-4"
                  >
                    Ver disponibilidad el {format(parseISO(nextAvailable), "EEEE d 'de' MMMM", { locale: es })} →
                  </button>
                ) : (
                  <p className="text-[#444] text-xs tracking-wider mb-5">Sin disponibilidad en los próximos 60 días.</p>
                )}

                {/* Lista de espera */}
                {!waitlistDone && !showWaitlist && (
                  <button
                    onClick={() => setShowWaitlist(true)}
                    className="text-[#666] text-xs tracking-wider underline underline-offset-4 hover:text-[#81807F] transition-colors"
                  >
                    Avisarme cuando haya disponibilidad
                  </button>
                )}

                {showWaitlist && !waitlistDone && (
                  <div className="mt-5 text-left border-t border-white/8 pt-5">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-[#666] mb-3">Lista de espera</p>
                    <p className="text-[#444] text-xs mb-4">Te avisaremos por WhatsApp cuando se libere un lugar para <span className="text-[#81807F]">{selectedService?.name}</span>.</p>
                    <button
                      disabled={waitlistSubmitting}
                      onClick={async () => {
                        setWaitlistSubmitting(true);
                        try {
                          await fetch('/api/waitlist', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              service_id: selectedService?.id,
                              preferred_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
                              client_name: clientName.trim() || 'Sin nombre',
                              client_phone: countryCode + clientPhone,
                              client_email: clientEmail || null,
                            }),
                          });
                          setWaitlistDone(true);
                        } finally { setWaitlistSubmitting(false); }
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-[#F0EDE8] text-[#16181E] py-3 text-[11px] tracking-[0.25em] uppercase font-semibold hover:bg-[#E0DBD4] transition-colors disabled:opacity-40"
                    >
                      {waitlistSubmitting ? 'Guardando…' : 'Confirmar — avisarme'}
                    </button>
                  </div>
                )}

                {waitlistDone && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-[#81807F] text-xs tracking-wider">
                    <Check size={13} /> Te avisaremos por WhatsApp cuando haya disponibilidad
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 xs:grid-cols-4 gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot.start}
                      disabled={!slot.available}
                      onClick={() => { setSelectedSlot(slot); setStep('confirm'); }}
                      className={`py-4 px-2 text-xs tracking-wide transition-all border ${
                        !slot.available
                          ? 'border-white/5 text-white/15 cursor-not-allowed line-through'
                          : selectedSlot?.start === slot.start
                          ? 'border-[#81807F] bg-[#F0EDE8] text-[#16181E] font-semibold'
                          : 'border-white/15 text-[#F0EDE8] hover:border-[#81807F]/50 hover:text-[#81807F]'
                      }`}
                    >
                      {formatTime(slot.start)}
                    </button>
                  ))}
                </div>
                <p className="text-[#444] text-[10px] tracking-[0.1em] uppercase mt-6">
                  Selecciona un horario para continuar
                </p>
              </>
            )}
          </div>
        )}

        {/* ─── STEP 5: CONFIRM ─── */}
        {step === 'confirm' && selectedService && selectedDate && selectedSlot && (
          <div>
            <div className="mb-5">
              <button
                onClick={() => setStep('time')}
                className="flex items-center gap-2 text-[#666] hover:text-[#81807F] transition-colors text-xs tracking-wider mb-4"
              >
                <ArrowLeft size={13} /> Atrás
              </button>
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-light text-[#F0EDE8] leading-tight mb-1">
                Confirmar cita
              </h2>
              <p className="text-[#666] text-xs tracking-[0.1em] uppercase">
                Revisa los detalles antes de continuar
              </p>
            </div>

            {/* Summary — hairline divided rows, no card boxes */}
            <div className="divide-y divide-white/8 mb-5">

              <div className="py-3 flex items-start gap-4">
                <Scissors size={13} className="text-[#81807F] mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] tracking-[0.15em] uppercase text-[#666] mb-1">Servicio</p>
                  <p className="text-[#F0EDE8] text-sm">{selectedService.name}</p>
                  <p className="text-[#666] text-xs mt-0.5">
                    {formatDuration(selectedService.duration_minutes)}
                  </p>
                </div>
              </div>

              <div className="py-3 flex items-start gap-4">
                <Calendar size={13} className="text-[#81807F] mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] tracking-[0.15em] uppercase text-[#666] mb-1">Fecha y hora</p>
                  <p className="text-[#F0EDE8] text-sm capitalize">
                    {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                  </p>
                  <p className="text-[#666] text-xs mt-0.5">
                    {formatTime(selectedSlot.start)} — {formatTime(selectedSlot.end)}
                  </p>
                </div>
              </div>

              <div className="py-3 flex items-start gap-4">
                <User size={13} className="text-[#81807F] mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] tracking-[0.15em] uppercase text-[#666] mb-1">Cliente</p>
                  <p className="text-[#F0EDE8] text-sm">{clientName}</p>
                  <p className="text-[#666] text-xs mt-0.5">{countryCode} {clientPhone}</p>
                  {clientEmail && <p className="text-[#666] text-xs mt-0.5">{clientEmail}</p>}
                </div>
              </div>

              {/* Trusted VIP block or deposit */}
              {isTrusted ? (
                <div className="py-3 flex items-start gap-4">
                  <Check size={13} className="text-[#81807F] mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] tracking-[0.15em] uppercase text-[#81807F] mb-1">Clienta frecuente ✦</p>
                    <p className="text-[#F0EDE8] text-sm">Sin anticipo requerido</p>
                    <p className="text-[#666] text-xs mt-0.5">Tu cita se confirma de inmediato</p>
                  </div>
                </div>
              ) : (
                <div className="py-3 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <CreditCard size={13} className="text-[#81807F] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] tracking-[0.15em] uppercase text-[#666] mb-1">Anticipo a pagar</p>
                      <p className="text-[#F0EDE8] text-sm">Se descuenta del total el día de tu cita</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[#81807F] text-xl font-light">${selectedService.deposit_amount}</p>
                    <p className="text-[#666] text-[10px] tracking-wider uppercase mt-0.5">MXN</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border border-white/6 px-4 py-2.5 mb-4 text-center">
              <p className="text-[#81807F] text-[9px] tracking-[0.2em] uppercase mb-0.5">Política de cancelación</p>
              <p className="text-[#555] text-[11px] leading-snug">
                El anticipo <span className="text-[#81807F]">no es reembolsable</span> si cancelas con menos de 24 h de anticipación.
              </p>
            </div>

            {bookingError && (
              <div className="mb-5 px-4 py-3 border border-red-900/40 bg-red-950/20">
                <p className="text-red-400 text-xs leading-relaxed">{bookingError}</p>
              </div>
            )}

            <button
              onClick={handlePay}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-3 py-4 text-[11px] tracking-[0.25em] uppercase font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isTrusted ? '#F0EDE8' : '#009EE3',
                color: isTrusted ? '#16181E' : '#fff',
              }}
            >
              {submitting ? (
                <>
                  <div
                    className="w-4 h-4 border border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: isTrusted ? '#16181E' : '#fff', borderTopColor: 'transparent' }}
                  />
                  Confirmando...
                </>
              ) : isTrusted ? (
                <><Check size={14} /> Confirmar mi cita</>
              ) : (
                <><CreditCard size={14} /> Pagar ${selectedService.deposit_amount} MXN con MercadoPago</>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default function ReservarPage() {
  return (
    <Suspense>
      <BookingContent />
    </Suspense>
  );
}
