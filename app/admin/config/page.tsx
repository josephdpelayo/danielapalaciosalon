'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, BellOff, Check, Copy, ArrowUpRight } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, Input, Textarea, Label, PageHeader, Spinner, useToast } from '@/components/ui';
import { WeeklyScheduleEditor, type WeeklyScheduleDay } from '@/app/admin/_shared/weekly-schedule-editor';
import { useSettings } from '@/lib/hooks/useSettings';
import { useSchedule } from '@/lib/hooks/useSchedule';
import { usePush } from '@/lib/hooks/usePush';

const PLACEHOLDERS = ['{nombre}', '{servicio}', '{fecha}', '{hora}'];

function CopyButton({ text }: { text: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.2em] text-muted hover:text-cream transition-colors"
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  );
}

export default function ConfigPage() {
  const { settings, isLoading: settingsLoading, save } = useSettings();
  const { schedule, isLoading: scheduleLoading, updateDay } = useSchedule();
  const { enabled: pushEnabled, loading: pushLoading, register, unregister } = usePush();
  const toast = useToast();

  // Overrides locales por sección: mientras un campo no se toque, el valor mostrado
  // viene de `settings` (server); al editarlo, la copia local gana. Esto evita tener
  // que sincronizar `settings` -> estado local con un efecto (y su condición de carrera
  // mientras isLoading pasa de true a false).
  const [identityOverride, setIdentityOverride] = useState<Partial<typeof identityDefaults>>({});
  const [bookingOverride, setBookingOverride] = useState<Partial<typeof bookingDefaults>>({});
  const [messagesOverride, setMessagesOverride] = useState<Partial<typeof messagesDefaults>>({});

  const identityDefaults = {
    salon_name: settings.salon_name ?? '',
    city: settings.city ?? '',
    whatsapp: settings.whatsapp ?? '',
    instagram: settings.instagram ?? '',
    description: settings.description ?? '',
  };
  const bookingDefaults = {
    advance_days: settings.advance_days ?? '60',
    min_notice_hours: settings.min_notice_hours ?? '2',
  };
  const messagesDefaults = {
    msg_confirmation: settings.msg_confirmation ?? '',
    msg_reminder_24h: settings.msg_reminder_24h ?? '',
  };

  const identity = { ...identityDefaults, ...identityOverride };
  const booking = { ...bookingDefaults, ...bookingOverride };
  const messages = { ...messagesDefaults, ...messagesOverride };

  const setIdentity = (updater: (p: typeof identity) => typeof identity) =>
    setIdentityOverride((p) => updater({ ...identityDefaults, ...p }));
  const setBooking = (updater: (p: typeof booking) => typeof booking) =>
    setBookingOverride((p) => updater({ ...bookingDefaults, ...p }));
  const setMessages = (updater: (p: typeof messages) => typeof messages) =>
    setMessagesOverride((p) => updater({ ...messagesDefaults, ...p }));

  const [savingIdentity, setSavingIdentity] = useState(false);
  const [savingBooking, setSavingBooking] = useState(false);
  const [savingMessages, setSavingMessages] = useState(false);

  const handleSaveIdentity = async () => {
    setSavingIdentity(true);
    try {
      await save(identity);
      toast.success('Identidad guardada');
    } catch {
      toast.error('No se pudo guardar la identidad');
    } finally {
      setSavingIdentity(false);
    }
  };

  const handleSaveBooking = async () => {
    setSavingBooking(true);
    try {
      await save(booking);
      toast.success('Ventana de reservas guardada');
    } catch {
      toast.error('No se pudo guardar la ventana de reservas');
    } finally {
      setSavingBooking(false);
    }
  };

  const handleSaveMessages = async () => {
    setSavingMessages(true);
    try {
      await save(messages);
      toast.success('Plantillas guardadas');
    } catch {
      toast.error('No se pudieron guardar las plantillas');
    } finally {
      setSavingMessages(false);
    }
  };

  const handleScheduleChange = async (dayOfWeek: number, updates: Partial<WeeklyScheduleDay>) => {
    const current = schedule.find((d) => d.day_of_week === dayOfWeek) ?? {
      day_of_week: dayOfWeek,
      is_active: false,
      start_time: '10:00',
      end_time: '19:00',
      break_start: null,
      break_end: null,
    };
    const merged = { ...current, ...updates };
    try {
      await updateDay({
        day_of_week: dayOfWeek,
        is_active: merged.is_active,
        start_time: merged.start_time,
        end_time: merged.end_time,
        break_start: merged.break_start ?? null,
        break_end: merged.break_end ?? null,
      });
    } catch {
      toast.error('No se pudo guardar el horario');
    }
  };

  const handleTogglePush = async () => {
    try {
      if (pushEnabled) {
        await unregister();
        toast.success('Notificaciones push desactivadas');
      } else {
        const ok = await register();
        if (ok) {
          toast.success('Notificaciones push activadas');
        } else {
          toast.error('No se pudo activar — revisa los permisos del navegador');
        }
      }
    } catch {
      toast.error('Ocurrió un error con las notificaciones push');
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Panel administrativo" title="Config" description="Identidad del salón, horario, ventana de reservas y plantillas de WhatsApp" />

      <div className="space-y-6">
        {/* Identidad */}
        <Card>
          <CardHeader>
            <CardTitle>Identidad del negocio</CardTitle>
          </CardHeader>
          {settingsLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Nombre del salón</Label>
                  <Input
                    value={identity.salon_name}
                    placeholder="Daniela Palacio Hair Room"
                    onChange={(e) => setIdentity((p) => ({ ...p, salon_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Ciudad</Label>
                  <Input
                    value={identity.city}
                    placeholder="Mazatlán, Sin."
                    onChange={(e) => setIdentity((p) => ({ ...p, city: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>WhatsApp (con código)</Label>
                  <Input
                    value={identity.whatsapp}
                    placeholder="526699445566"
                    onChange={(e) => setIdentity((p) => ({ ...p, whatsapp: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Instagram (sin @)</Label>
                  <Input
                    value={identity.instagram}
                    placeholder="danielapalaciosalon"
                    onChange={(e) => setIdentity((p) => ({ ...p, instagram: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Descripción corta</Label>
                  <Input
                    value={identity.description}
                    placeholder="Breve texto que aparece bajo el nombre"
                    onChange={(e) => setIdentity((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveIdentity} loading={savingIdentity}>
                  Guardar
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Horario global */}
        <Card>
          <CardHeader>
            <CardTitle>Horario global</CardTitle>
          </CardHeader>
          {scheduleLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <>
              <WeeklyScheduleEditor days={schedule} onChange={handleScheduleChange} allowBreaks />
              <p className="text-muted text-[11px] mt-3">Los cambios de horario se guardan al instante.</p>
            </>
          )}
        </Card>

        {/* Ventana de reservas */}
        <Card>
          <CardHeader>
            <CardTitle>Ventana de reservaciones</CardTitle>
          </CardHeader>
          {settingsLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Días de anticipación máxima</Label>
                  <Input
                    type="number"
                    min={7}
                    max={365}
                    value={booking.advance_days}
                    onChange={(e) => setBooking((p) => ({ ...p, advance_days: e.target.value }))}
                  />
                  <p className="text-muted text-[11px] mt-1.5">Las clientas podrán ver hasta este número de días adelante</p>
                </div>
                <div>
                  <Label>Aviso mínimo (horas)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={72}
                    value={booking.min_notice_hours}
                    onChange={(e) => setBooking((p) => ({ ...p, min_notice_hours: e.target.value }))}
                  />
                  <p className="text-muted text-[11px] mt-1.5">No se puede reservar con menos de X horas de anticipación</p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveBooking} loading={savingBooking}>
                  Guardar
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Servicios shortcut */}
        <Card>
          <CardHeader>
            <CardTitle>Servicios</CardTitle>
          </CardHeader>
          <div className="flex items-center justify-between gap-4">
            <p className="text-muted text-[13px]">La administración de servicios ahora vive en su propia sección.</p>
            <Link href="/admin/servicios">
              <Button variant="secondary" size="sm" icon={<ArrowUpRight size={14} />}>
                Ir a Servicios
              </Button>
            </Link>
          </div>
        </Card>

        {/* Plantillas de WhatsApp */}
        <Card>
          <CardHeader>
            <CardTitle>Mensajes de WhatsApp</CardTitle>
          </CardHeader>
          {settingsLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="mb-0">Confirmación de reserva</Label>
                  <CopyButton text={messages.msg_confirmation} />
                </div>
                <Textarea
                  rows={4}
                  value={messages.msg_confirmation}
                  onChange={(e) => setMessages((p) => ({ ...p, msg_confirmation: e.target.value }))}
                />
                <p className="text-muted text-[11px] mt-1.5">Se envía después de que una clienta completa su reserva</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="mb-0">Mensaje recordatorio 24h antes</Label>
                  <CopyButton text={messages.msg_reminder_24h} />
                </div>
                <Textarea
                  rows={6}
                  value={messages.msg_reminder_24h}
                  onChange={(e) => setMessages((p) => ({ ...p, msg_reminder_24h: e.target.value }))}
                />
                <p className="text-muted text-[11px] mt-1.5">Usa los placeholders: {'{nombre} {servicio} {fecha} {hora}'}</p>
              </div>
              <div className="p-3 border border-white/8 bg-surface-2">
                <p className="text-[9px] uppercase tracking-[0.25em] text-muted mb-2">Variables disponibles</p>
                <div className="flex flex-wrap gap-2">
                  {PLACEHOLDERS.map((v) => (
                    <span key={v} className="text-[11px] font-mono px-2 py-0.5 border border-white/10 text-stone">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveMessages} loading={savingMessages}>
                  Guardar
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Notificaciones push */}
        <Card>
          <CardHeader>
            <CardTitle>Notificaciones push</CardTitle>
          </CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {pushEnabled ? <Bell size={18} className="text-stone" /> : <BellOff size={18} className="text-muted" />}
              <div>
                <p className="text-cream text-sm">{pushEnabled ? 'Activadas' : 'Desactivadas'}</p>
                <p className="text-muted text-[11px]">Recibe avisos de nuevas citas y cambios directamente en este dispositivo</p>
              </div>
            </div>
            <Button
              variant={pushEnabled ? 'destructive' : 'primary'}
              size="sm"
              loading={pushLoading}
              onClick={handleTogglePush}
            >
              {pushEnabled ? 'Desactivar' : 'Activar'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
