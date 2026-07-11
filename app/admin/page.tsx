'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format, parseISO, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Plus,
  Check,
  X,
  Star,
  Phone,
  MessageCircle,
  Bell,
  ArrowRight,
  CalendarClock,
  AlertCircle,
  Banknote,
  ListTodo,
} from 'lucide-react';

import {
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardEyebrow,
  StatCard,
  Badge,
  statusToTone,
  Button,
  Modal,
  Input,
  Select,
  Textarea,
  Label,
  FieldError,
  EmptyState,
  Skeleton,
  SkeletonCard,
  useToast,
  useConfirm,
} from '@/components/ui';

import { useAppointments } from '@/lib/hooks/useAppointments';
import { useStats } from '@/lib/hooks/useStats';
import { useWaitlist } from '@/lib/hooks/useWaitlist';
import { useServices } from '@/lib/hooks/useServices';
import { useSettings } from '@/lib/hooks/useSettings';
import { useReminders } from '@/lib/hooks/useReminders';
import { formatTime, timeToMinutes, minutesToTime } from '@/lib/slots';
import type { Appointment } from '@/lib/types';

const DEFAULT_MSG_REMINDER =
  'Hola {nombre} 👋✨\n\nTe recuerdo que mañana tienes cita en *Daniela Palacio Hair Room*:\n\n📅 {fecha}\n⏰ {hora} hrs\n✂️ *{servicio}*\n\nPor favor confírmame tu asistencia respondiendo *SÍ ✅* o en caso de no poder asistir avísame con anticipación.\n\n¡Te esperamos! 🌟\n— Daniela Palacio Hair Room';

const DEFAULT_MSG_CONFIRMATION =
  'Hola {nombre} 👋 Tu cita para *{servicio}* está confirmada para el *{fecha}* a las *{hora}* 💛 Si necesitas cancelar o reagendar, escríbeme con al menos 24h de anticipación.';

function waHref(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  const number = digits.length >= 12 ? digits : `52${digits.slice(-10)}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function fillTemplate(template: string, apt: Appointment): string {
  const date = parseISO(apt.appointment_date + 'T12:00:00');
  const dateStr = format(date, "EEEE d 'de' MMMM", { locale: es });
  return template
    .replace(/\{nombre\}/g, apt.client_name)
    .replace(/\{servicio\}/g, apt.dp_services?.name ?? 'tu servicio')
    .replace(/\{fecha\}/g, dateStr)
    .replace(/\{hora\}/g, formatTime(apt.start_time));
}

function dateLabel(dateStr: string, todayKey: string): string {
  if (dateStr === todayKey) return 'Hoy';
  const dt = parseISO(dateStr + 'T12:00:00');
  if (isTomorrow(dt)) return 'Mañana';
  return format(dt, "EEE d 'de' MMM", { locale: es });
}

interface NewApptForm {
  service_id: string;
  appointment_date: string;
  start_time: string;
  client_name: string;
  client_phone: string;
  notes: string;
}

const EMPTY_FORM: NewApptForm = {
  service_id: '',
  appointment_date: '',
  start_time: '',
  client_name: '',
  client_phone: '',
  notes: '',
};

export default function AdminDashboardPage() {
  const toast = useToast();
  const confirm = useConfirm();

  const { appointments, isLoading: apptsLoading, create, updateStatus, markReminderSent } = useAppointments();
  const { stats, isLoading: statsLoading } = useStats();
  const { entries: waitlistEntries, isLoading: waitlistLoading } = useWaitlist('waiting');
  const { services } = useServices();
  const { settings } = useSettings();
  const { trigger: triggerReminders, triggering } = useReminders();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [showNewAppt, setShowNewAppt] = useState(false);
  const [form, setForm] = useState<NewApptForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const msgReminder = settings.msg_reminder_24h || DEFAULT_MSG_REMINDER;
  const msgConfirmation = settings.msg_confirmation || DEFAULT_MSG_CONFIRMATION;

  const { todayKey, tomorrowKey } = useMemo(() => {
    const now = new Date();
    return {
      todayKey: format(now, 'yyyy-MM-dd'),
      tomorrowKey: format(new Date(now.getTime() + 86_400_000), 'yyyy-MM-dd'),
    };
  }, []);

  const todayCount = useMemo(
    () => appointments.filter((a) => a.appointment_date === todayKey && a.status !== 'cancelled').length,
    [appointments, todayKey]
  );

  const needsAction = useMemo(
    () =>
      appointments
        .filter((a) => a.status === 'pending' || a.status === 'pending_payment')
        .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date) || a.start_time.localeCompare(b.start_time)),
    [appointments]
  );

  const upcoming = useMemo(
    () => appointments.filter((a) => a.appointment_date > todayKey && a.status !== 'cancelled'),
    [appointments, todayKey]
  );

  const tomorrowAppts = useMemo(
    () =>
      appointments
        .filter((a) => a.appointment_date === tomorrowKey && a.status !== 'cancelled')
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [appointments, tomorrowKey]
  );

  const remindersSentCount = tomorrowAppts.filter((a) => a.reminder_sent_at).length;

  const isLoading = apptsLoading || statsLoading;

  async function handleConfirm(id: string) {
    setBusyId(id);
    try {
      await updateStatus(id, 'confirmed');
      toast.success('Cita confirmada.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo confirmar la cita.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleComplete(id: string) {
    setBusyId(id);
    try {
      await updateStatus(id, 'completed');
      toast.success('Cita marcada como completada.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo completar la cita.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(apt: Appointment) {
    const ok = await confirm({
      title: 'Cancelar cita',
      description: `¿Cancelar la cita de ${apt.client_name}? Esta acción no se puede deshacer.`,
      confirmLabel: 'Cancelar cita',
      danger: true,
    });
    if (!ok) return;
    setBusyId(apt.id);
    try {
      await updateStatus(apt.id, 'cancelled');
      toast.success('Cita cancelada.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cancelar la cita.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleSendReminder(apt: Appointment) {
    window.open(waHref(apt.client_phone, fillTemplate(msgReminder, apt)), '_blank', 'noopener,noreferrer');
    if (!apt.reminder_sent_at) {
      try {
        await markReminderSent(apt.id);
      } catch {
        toast.error('No se pudo marcar el recordatorio como enviado.');
      }
    }
  }

  async function handleTriggerReminders() {
    try {
      const result = await triggerReminders();
      toast.success(`Recordatorios procesados${result?.sent !== undefined ? ` — ${result.sent}` : ''}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron enviar los recordatorios.');
    }
  }

  function openNewAppt() {
    setForm(EMPTY_FORM);
    setFormError('');
    setShowNewAppt(true);
  }

  function closeNewAppt() {
    setShowNewAppt(false);
    setForm(EMPTY_FORM);
    setFormError('');
  }

  async function handleCreateAppt() {
    const { service_id, appointment_date, start_time, client_name, client_phone } = form;
    if (!service_id || !appointment_date || !start_time || !client_name.trim() || !client_phone.trim()) {
      setFormError('Completa todos los campos requeridos.');
      return;
    }
    const service = services.find((s) => s.id === service_id);
    if (!service) {
      setFormError('Selecciona un servicio válido.');
      return;
    }
    const end_time = minutesToTime(timeToMinutes(start_time) + service.duration_minutes);
    setFormError('');
    setSaving(true);
    try {
      await create({
        service_id,
        appointment_date,
        start_time,
        end_time,
        client_name: client_name.trim(),
        client_phone: client_phone.trim(),
        notes: form.notes.trim() || null,
      });
      toast.success('Cita creada.');
      closeNewAppt();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar la cita.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Panel"
        title="Inicio"
        actions={
          <Button size="sm" icon={<Plus size={12} />} onClick={openNewAppt}>
            Nueva cita
          </Button>
        }
      />

      {/* ── Stat tiles ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Hoy" value={todayCount} icon={CalendarClock} />
          <StatCard
            label="Pendientes"
            value={needsAction.length}
            deltaTone={needsAction.length > 0 ? 'negative' : 'neutral'}
            delta={needsAction.length > 0 ? 'Requieren atención' : undefined}
            icon={AlertCircle}
          />
          <StatCard label="Próximas" value={upcoming.length} icon={ListTodo} />
          <StatCard
            label="Ingreso del mes"
            value={`$${(stats?.month_revenue ?? 0).toLocaleString('es-MX')}`}
            delta="Depósitos recibidos"
            icon={Banknote}
          />
        </div>
      )}

      {stats?.top_service && (
        <p className="text-[11px] text-muted mb-6 -mt-3">
          Servicio más pedido: <span className="text-cream/80">{stats.top_service}</span>
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* ── Requieren atención ── */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div>
              <CardEyebrow>Requieren atención</CardEyebrow>
              <CardTitle>Pendientes de confirmar o pagar</CardTitle>
            </div>
          </CardHeader>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : needsAction.length === 0 ? (
            <EmptyState icon={Check} title="Sin pendientes" description="Todas las citas están confirmadas o al día." />
          ) : (
            <div className="divide-y divide-white/8">
              {needsAction.map((apt) => (
                <div key={apt.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm text-cream">{apt.client_name}</span>
                      <Badge tone={statusToTone(apt.status)} />
                    </div>
                    <p className="text-xs text-muted">
                      {apt.dp_services?.name ?? '—'} · {dateLabel(apt.appointment_date, todayKey)} {formatTime(apt.start_time)}
                    </p>
                    <a
                      href={`tel:${apt.client_phone}`}
                      className="flex items-center gap-1 text-muted hover:text-cream transition-colors text-xs mt-1 w-fit"
                    >
                      <Phone size={10} /> {apt.client_phone}
                    </a>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <a
                      href={waHref(apt.client_phone, fillTemplate(msgConfirmation, apt))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[9px] tracking-[0.15em] uppercase border border-emerald-400/30 text-emerald-400 px-2.5 py-1.5 hover:bg-emerald-400/10 transition-colors"
                    >
                      <MessageCircle size={10} /> WA
                    </a>
                    <Button size="sm" variant="secondary" loading={busyId === apt.id} icon={<Check size={11} />} onClick={() => handleConfirm(apt.id)}>
                      Confirmar
                    </Button>
                    <Button size="sm" variant="secondary" loading={busyId === apt.id} icon={<Star size={11} />} onClick={() => handleComplete(apt.id)}>
                      Completada
                    </Button>
                    <Button size="sm" variant="destructive" loading={busyId === apt.id} icon={<X size={11} />} onClick={() => handleCancel(apt)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Recordatorios de mañana ── */}
        <Card>
          <CardHeader>
            <div>
              <CardEyebrow>Recordatorios</CardEyebrow>
              <CardTitle>
                Mañana{tomorrowAppts.length > 0 ? ` · ${tomorrowAppts.length}` : ''}
                {remindersSentCount > 0 && (
                  <span className="text-emerald-400 text-sm font-normal ml-1.5">({remindersSentCount} enviados)</span>
                )}
              </CardTitle>
            </div>
            <Button size="sm" variant="secondary" loading={triggering} icon={<Bell size={11} />} onClick={handleTriggerReminders}>
              Push
            </Button>
          </CardHeader>

          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : tomorrowAppts.length === 0 ? (
            <EmptyState icon={Bell} title="Sin citas mañana" description="No hay recordatorios pendientes de enviar." />
          ) : (
            <div className="divide-y divide-white/8">
              {tomorrowAppts.map((apt) => {
                const sent = !!apt.reminder_sent_at;
                return (
                  <button
                    key={apt.id}
                    onClick={() => handleSendReminder(apt)}
                    className="w-full flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className={`text-sm truncate ${sent ? 'text-emerald-400' : 'text-cream'}`}>{apt.client_name}</p>
                      <p className="text-xs text-muted">
                        {apt.dp_services?.name ?? '—'} · {formatTime(apt.start_time)}
                      </p>
                    </div>
                    {sent ? (
                      <span className="flex items-center gap-1 text-[9px] text-emerald-400 uppercase tracking-wider shrink-0">
                        <Check size={11} /> Enviado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[9px] text-stone-light border border-stone/30 px-2 py-1 shrink-0">
                        <MessageCircle size={9} /> WA
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* ── Lista de espera ── */}
        <Card>
          <CardHeader>
            <div>
              <CardEyebrow>Lista de espera</CardEyebrow>
              <CardTitle>En espera{waitlistEntries.length > 0 ? ` · ${waitlistEntries.length}` : ''}</CardTitle>
            </div>
            <Link
              href="/admin/lista-espera"
              className="flex items-center gap-1 text-[10px] tracking-[0.15em] uppercase text-stone-light hover:text-cream transition-colors shrink-0"
            >
              Ver todo <ArrowRight size={11} />
            </Link>
          </CardHeader>

          {waitlistLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : waitlistEntries.length === 0 ? (
            <EmptyState icon={ListTodo} title="Sin lista de espera" description="No hay clientas esperando un lugar." />
          ) : (
            <div className="divide-y divide-white/8">
              {waitlistEntries.slice(0, 5).map((entry) => (
                <div key={entry.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-cream truncate">{entry.client_name}</p>
                    <p className="text-xs text-muted truncate">
                      {entry.dp_services?.name ?? '—'}
                      {entry.preferred_date ? ` · ${format(parseISO(entry.preferred_date), 'd MMM', { locale: es })}` : ''}
                    </p>
                  </div>
                  <a
                    href={waHref(
                      entry.client_phone,
                      `Hola ${entry.client_name}, te contactamos de Daniela Palacio Hair Room porque se liberó un lugar. ¿Te gustaría agendar tu cita?`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[9px] tracking-[0.15em] uppercase border border-stone/30 text-stone-light px-2.5 py-1.5 hover:bg-white/5 transition-colors shrink-0"
                  >
                    <MessageCircle size={10} /> WA
                  </a>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Modal Nueva cita ── */}
      <Modal open={showNewAppt} onClose={closeNewAppt} title="Nueva cita">
        <div className="space-y-3">
          <div>
            <Label htmlFor="na-service">Servicio *</Label>
            <Select id="na-service" value={form.service_id} onChange={(e) => setForm((p) => ({ ...p, service_id: e.target.value }))}>
              <option value="">Selecciona servicio…</option>
              {services
                .filter((s) => s.active)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="na-date">Fecha *</Label>
            <Input
              id="na-date"
              type="date"
              min={todayKey}
              value={form.appointment_date}
              onChange={(e) => setForm((p) => ({ ...p, appointment_date: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="na-time">Hora inicio *</Label>
            <Input id="na-time" type="time" value={form.start_time} onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="na-name">Nombre de clienta *</Label>
            <Input
              id="na-name"
              type="text"
              placeholder="Nombre completo"
              value={form.client_name}
              onChange={(e) => setForm((p) => ({ ...p, client_name: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="na-phone">Teléfono *</Label>
            <Input
              id="na-phone"
              type="tel"
              placeholder="10 dígitos"
              value={form.client_phone}
              onChange={(e) => setForm((p) => ({ ...p, client_phone: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="na-notes">
              Notas <span className="normal-case tracking-normal text-muted/70">— opcional</span>
            </Label>
            <Textarea
              id="na-notes"
              placeholder="Alergias, preferencias…"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>
          <FieldError>{formError}</FieldError>
          <Button className="w-full" loading={saving} icon={<Plus size={12} />} onClick={handleCreateAppt}>
            Crear cita
          </Button>
        </div>
      </Modal>
    </div>
  );
}
