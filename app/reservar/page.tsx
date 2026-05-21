'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { format, addDays, isBefore, startOfToday, getDay } from 'date-fns';
import { ArrowLeft, ArrowRight, Check, Scissors, Calendar, User, CreditCard } from 'lucide-react';
import { MOCK_SERVICES, MOCK_SCHEDULE } from '@/lib/mock-data';
import { Service, TimeSlot } from '@/lib/types';
import { formatTime, formatDuration, formatPrice } from '@/lib/slots';
import 'react-day-picker/dist/style.css';

type Step = 'info' | 'service' | 'date' | 'time' | 'confirm';
const STEPS_LIST: Step[] = ['info', 'service', 'date', 'time', 'confirm'];

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
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isTrusted, setIsTrusted] = useState(false);
  const [trustedName, setTrustedName] = useState<string | null>(null);
  const [checkingPhone, setCheckingPhone] = useState(false);

  useEffect(() => {
    fetch('/api/services')
      .then((r) => r.json())
      .then((d) => { if (d.services?.length) setServices(d.services); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const sid = searchParams.get('service');
    if (sid) {
      const svc = services.find((s) => s.id === sid);
      if (svc) { setSelectedService(svc); setStep('date'); }
    }
  }, [searchParams, services]);

  useEffect(() => {
    if (!selectedDate || !selectedService) { setSlots([]); return; }
    setLoadingSlots(true);
    const dow = getDay(selectedDate);
    const schedule = MOCK_SCHEDULE.find((s) => s.day_of_week === dow);
    if (!schedule || !schedule.is_active) { setSlots([]); setLoadingSlots(false); return; }

    fetch(`/api/available-slots?date=${format(selectedDate, 'yyyy-MM-dd')}&service_id=${selectedService.id}&duration=${selectedService.duration_minutes}&active_minutes=${selectedService.active_minutes}`)
      .then((r) => r.json())
      .then((data) => { setSlots(data.slots || []); })
      .catch(() => { setSlots([]); })
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, selectedService]);

  const isDisabledDay = (date: Date) => {
    if (isBefore(date, startOfToday())) return true;
    const dow = getDay(date);
    const schedule = MOCK_SCHEDULE.find((s) => s.day_of_week === dow);
    return !schedule?.is_active;
  };

  const checkTrustedPhone = async (phone: string) => {
    if (phone.replace(/\D/g, '').length < 8) { setIsTrusted(false); setTrustedName(null); return; }
    setCheckingPhone(true);
    try {
      const res = await fetch(`/api/trusted-check?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      setIsTrusted(data.trusted);
      setTrustedName(data.trusted ? data.client?.name ?? null : null);
      if (data.trusted && data.client?.name && !clientName) setClientName(data.client.name);
    } catch { setIsTrusted(false); }
    finally { setCheckingPhone(false); }
  };

  const handlePay = async () => {
    if (!selectedService || !selectedDate || !selectedSlot) return;
    setSubmitting(true);
    try {
      // 1. Create appointment
      const apptRes = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: selectedService.id,
          client_name: clientName,
          client_phone: clientPhone,
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
    } catch {
      alert('Hubo un error. Por favor intenta de nuevo o contáctanos por WhatsApp.');
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
        <Link href="/" className="flex items-center gap-2 text-[#666] hover:text-[#C9A84C] transition-colors text-sm">
          <ArrowLeft size={15} />
          <span className="hidden sm:inline tracking-wider">Volver</span>
        </Link>
        <div className="font-[family-name:var(--font-display)] text-xs tracking-[0.28em] uppercase text-[#C9A84C]">
          Daniela Palacio
        </div>
        <div className="w-10 sm:w-20" />
      </div>

      {/* Progress — thin line + 5 dots + current label */}
      <div className="px-5 pt-8 pb-5 max-w-xl mx-auto">
        <div className="relative flex items-center mb-3">
          <div className="absolute left-0 right-0 h-px bg-white/8" />
          <div
            className="absolute left-0 h-px bg-[#C9A84C] transition-all duration-500"
            style={{ width: stepIndex === 0 ? '0%' : `${(stepIndex / (STEPS_LIST.length - 1)) * 100}%` }}
          />
          <div className="relative w-full flex justify-between">
            {STEPS_LIST.map((s, i) => {
              const isPast = i < stepIndex;
              const isCurrent = i === stepIndex;
              return (
                <div key={s} className="w-2 h-2 rounded-full border transition-all duration-300 shrink-0"
                  style={{
                    background: isPast || isCurrent ? '#C9A84C' : 'transparent',
                    borderColor: isPast || isCurrent ? '#C9A84C' : 'rgba(255,255,255,0.2)',
                    boxShadow: isCurrent ? '0 0 0 3px rgba(201,168,76,0.15)' : 'none',
                  }}
                />
              );
            })}
          </div>
        </div>
        {/* Current step label + counter */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] tracking-[0.2em] uppercase text-[#C9A84C]">
            {stepLabels[step]}
          </span>
          <span className="text-[10px] text-white/20 tracking-wider">
            {stepIndex + 1} / {STEPS_LIST.length}
          </span>
        </div>
      </div>

      <div className="px-5 pb-36 max-w-xl mx-auto">

        {/* ─── STEP 1: INFO ─── */}
        {step === 'info' && (
          <div>
            <div className="mb-10">
              <h2 className="font-[family-name:var(--font-display)] text-4xl font-light text-[#F0EDE8] leading-tight mb-3">
                Cuéntame de ti
              </h2>
              <p className="text-[#666] text-xs tracking-[0.1em] uppercase">
                Ingresa tus datos para comenzar
              </p>
            </div>

            <div className="space-y-8">

              {/* Name */}
              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase text-[#666] mb-3">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full bg-transparent border border-white/10 text-[#F0EDE8] px-4 py-3.5 focus:outline-none focus:border-[#C9A84C]/60 transition-colors placeholder:text-white/20" style={{ fontSize: '16px' }}
                />
              </div>

              {/* Phone with +52 prefix */}
              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase text-[#666] mb-3">
                  WhatsApp *
                </label>
                <div className={`flex border transition-colors ${isTrusted ? 'border-[#C9A84C]/60' : 'border-white/10 focus-within:border-[#C9A84C]/60'}`}>
                  <span className="px-3 flex items-center text-[#666] text-sm bg-transparent border-r border-white/10 select-none">
                    +52
                  </span>
                  <div className="flex-1 relative">
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={clientPhone}
                      onChange={(e) => { setClientPhone(e.target.value); setIsTrusted(false); setTrustedName(null); }}
                      onBlur={(e) => checkTrustedPhone(e.target.value)}
                      placeholder="669 123 4567"
                      className="flex-1 w-full bg-transparent px-3 py-3.5 text-white focus:outline-none"
                      style={{ fontSize: '16px' }}
                    />
                    {checkingPhone && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                </div>
                {isTrusted && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#C9A84C]/10 flex items-center justify-center shrink-0">
                      <Check size={10} className="text-[#C9A84C]" />
                    </div>
                    <span className="text-xs text-[#C9A84C] tracking-wide">
                      ¡Hola{trustedName ? ` ${trustedName.split(' ')[0]}` : ''}! Como clienta frecuente no necesitas anticipo ✦
                    </span>
                  </div>
                )}
              </div>

              {/* Email optional */}
              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase text-[#666] mb-3">
                  Correo electrónico <span className="normal-case tracking-normal text-[#444]">— opcional</span>
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full bg-transparent border border-white/10 text-[#F0EDE8] px-4 py-3.5 focus:outline-none focus:border-[#C9A84C]/60 transition-colors placeholder:text-white/20" style={{ fontSize: '16px' }}
                />
              </div>

              {/* Notes optional */}
              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase text-[#666] mb-3">
                  Notas <span className="normal-case tracking-normal text-[#444]">— opcional</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Longitud de cabello, alergias, referencias de color..."
                  rows={3}
                  className="w-full bg-transparent border border-white/10 text-[#F0EDE8] px-4 py-3.5 focus:outline-none focus:border-[#C9A84C]/60 transition-colors placeholder:text-white/20 resize-none"
                  style={{ fontSize: '16px' }}
                />
              </div>

              <div className="pt-2">
                <button
                  disabled={!clientName.trim() || !clientPhone.trim()}
                  onClick={() => setStep('service')}
                  className="w-full flex items-center justify-center gap-3 bg-[#C9A84C] text-black py-4 text-[11px] tracking-[0.25em] uppercase font-semibold hover:bg-[#dbb85e] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Continuar <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 2: SERVICE ─── */}
        {step === 'service' && (
          <div>
            <div className="mb-10">
              <button
                onClick={() => setStep('info')}
                className="flex items-center gap-2 text-[#666] hover:text-[#C9A84C] transition-colors text-xs tracking-wider mb-6"
              >
                <ArrowLeft size={13} /> Atrás
              </button>
              <h2 className="font-[family-name:var(--font-display)] text-4xl font-light text-[#F0EDE8] leading-tight mb-3">
                Elige un servicio
              </h2>
              <p className="text-[#666] text-xs tracking-[0.1em] uppercase">
                Selecciona el tratamiento que deseas
              </p>
            </div>

            <div className="divide-y divide-white/8">
              {services.map((svc) => (
                <button
                  key={svc.id}
                  onClick={() => { setSelectedService(svc); setSelectedDate(undefined); setSelectedSlot(null); setStep('date'); }}
                  className="w-full text-left py-6 hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[#F0EDE8] text-sm font-medium group-hover:text-white transition-colors">
                          {svc.name}
                        </span>
                        <span className="text-[10px] text-[#C9A84C] tracking-[0.15em] uppercase">
                          {formatPrice(svc.price)}
                        </span>
                      </div>
                      <p className="text-[#666] text-xs leading-relaxed">{svc.description}</p>
                      <p className="text-[#444] text-[10px] mt-2 tracking-[0.1em] uppercase">{formatDuration(svc.duration_minutes)}</p>
                    </div>
                    <ArrowRight size={14} className="text-[#333] group-hover:text-[#C9A84C] transition-colors mt-1 shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── STEP 3: DATE ─── */}
        {step === 'date' && selectedService && (
          <div>
            <div className="mb-10">
              <button
                onClick={() => setStep('service')}
                className="flex items-center gap-2 text-[#666] hover:text-[#C9A84C] transition-colors text-xs tracking-wider mb-6"
              >
                <ArrowLeft size={13} /> Atrás
              </button>
              <h2 className="font-[family-name:var(--font-display)] text-4xl font-light text-[#F0EDE8] leading-tight mb-3">
                Elige una fecha
              </h2>
              <div className="flex items-center gap-3">
                <p className="text-[#666] text-xs tracking-[0.1em] uppercase">
                  {selectedService.name} · {formatDuration(selectedService.duration_minutes)}
                </p>
                <button
                  onClick={() => setStep('service')}
                  className="text-[10px] text-[#C9A84C] border border-white/10 px-2 py-1 hover:border-[#C9A84C]/40 transition-colors tracking-wider uppercase"
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
                  selected: { backgroundColor: '#C9A84C', color: '#000', fontWeight: '600', borderRadius: '0' },
                  today: { color: '#C9A84C', fontWeight: '600' },
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
                  className="w-full flex items-center justify-center gap-3 bg-[#C9A84C] text-black py-4 text-[11px] tracking-[0.25em] uppercase font-semibold hover:bg-[#dbb85e] transition-colors"
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
            <div className="mb-10">
              <button
                onClick={() => setStep('date')}
                className="flex items-center gap-2 text-[#666] hover:text-[#C9A84C] transition-colors text-xs tracking-wider mb-6"
              >
                <ArrowLeft size={13} /> Atrás
              </button>
              <h2 className="font-[family-name:var(--font-display)] text-4xl font-light text-[#F0EDE8] leading-tight mb-3">
                Elige un horario
              </h2>
              <p className="text-[#666] text-xs tracking-[0.1em] uppercase capitalize">
                {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
              </p>
            </div>

            {loadingSlots ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-5 h-5 border border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-16 border border-white/8">
                <p className="text-[#666] text-sm mb-4">No hay horarios disponibles para este día.</p>
                <button
                  onClick={() => setStep('date')}
                  className="text-[#C9A84C] text-xs tracking-widest uppercase border-b border-[#C9A84C]/40 pb-px hover:border-[#C9A84C] transition-colors"
                >
                  Elegir otra fecha
                </button>
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
                          ? 'border-[#C9A84C] bg-[#C9A84C] text-black font-semibold'
                          : 'border-white/15 text-[#F0EDE8] hover:border-[#C9A84C]/50 hover:text-[#C9A84C]'
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
            <div className="mb-10">
              <button
                onClick={() => setStep('time')}
                className="flex items-center gap-2 text-[#666] hover:text-[#C9A84C] transition-colors text-xs tracking-wider mb-6"
              >
                <ArrowLeft size={13} /> Atrás
              </button>
              <h2 className="font-[family-name:var(--font-display)] text-4xl font-light text-[#F0EDE8] leading-tight mb-3">
                Confirmar cita
              </h2>
              <p className="text-[#666] text-xs tracking-[0.1em] uppercase">
                Revisa los detalles antes de continuar
              </p>
            </div>

            {/* Summary — hairline divided rows, no card boxes */}
            <div className="divide-y divide-white/8 mb-12">

              <div className="py-5 flex items-start gap-4">
                <Scissors size={14} className="text-[#C9A84C] mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] tracking-[0.15em] uppercase text-[#666] mb-2">Servicio</p>
                  <p className="text-[#F0EDE8] text-sm">{selectedService.name}</p>
                  <p className="text-[#666] text-xs mt-1">
                    {formatDuration(selectedService.duration_minutes)} · Total {formatPrice(selectedService.price)}
                  </p>
                </div>
              </div>

              <div className="py-5 flex items-start gap-4">
                <Calendar size={14} className="text-[#C9A84C] mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] tracking-[0.15em] uppercase text-[#666] mb-2">Fecha y hora</p>
                  <p className="text-[#F0EDE8] text-sm capitalize">
                    {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                  </p>
                  <p className="text-[#666] text-xs mt-1">
                    {formatTime(selectedSlot.start)} — {formatTime(selectedSlot.end)}
                  </p>
                </div>
              </div>

              <div className="py-5 flex items-start gap-4">
                <User size={14} className="text-[#C9A84C] mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] tracking-[0.15em] uppercase text-[#666] mb-2">Cliente</p>
                  <p className="text-[#F0EDE8] text-sm">{clientName}</p>
                  <p className="text-[#666] text-xs mt-1">+52 {clientPhone}</p>
                  {clientEmail && <p className="text-[#666] text-xs mt-0.5">{clientEmail}</p>}
                </div>
              </div>

              {/* Trusted VIP block or deposit */}
              {isTrusted ? (
                <div className="py-5 flex items-start gap-4">
                  <Check size={14} className="text-[#C9A84C] mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] tracking-[0.15em] uppercase text-[#C9A84C] mb-2">Clienta frecuente ✦</p>
                    <p className="text-[#F0EDE8] text-sm">Sin anticipo requerido</p>
                    <p className="text-[#666] text-xs mt-1">Tu cita se confirma de inmediato</p>
                  </div>
                </div>
              ) : (
                <div className="py-5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <CreditCard size={14} className="text-[#C9A84C] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] tracking-[0.15em] uppercase text-[#666] mb-2">Anticipo a pagar</p>
                      <p className="text-[#F0EDE8] text-sm">Se descuenta del total el día de tu cita</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[#C9A84C] text-2xl font-light">${selectedService.deposit_amount}</p>
                    <p className="text-[#666] text-[10px] tracking-wider uppercase mt-0.5">MXN</p>
                  </div>
                </div>
              )}
            </div>

            {!isTrusted && (
              <p className="text-[#444] text-[10px] tracking-[0.1em] uppercase text-center mb-8 leading-relaxed">
                El anticipo confirma tu cita automáticamente.<br />
                Se descuenta del total el día de tu visita.
              </p>
            )}

            <button
              onClick={handlePay}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-3 py-4 text-[11px] tracking-[0.25em] uppercase font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isTrusted ? '#C9A84C' : '#009EE3',
                color: isTrusted ? '#000' : '#fff',
              }}
            >
              {submitting ? (
                <>
                  <div
                    className="w-4 h-4 border border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: isTrusted ? '#000' : '#fff', borderTopColor: 'transparent' }}
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
