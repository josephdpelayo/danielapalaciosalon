'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  format, parseISO, isToday, isTomorrow,
  startOfToday, addDays, getDay, formatDistanceToNow,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { DayPicker } from 'react-day-picker';
import {
  ArrowLeft, ArrowRight, Check, X, Scissors, Phone, RefreshCw,
  Trash2, CalendarOff, Star, UserPlus, Calendar, Plus, Pencil, LayoutDashboard,
  Settings, Copy, Check as CheckIcon, MessageCircle, Bell, Users,
} from 'lucide-react';
import { Appointment, BlockedSlot } from '@/lib/types';
import { formatTime, formatDuration, timeToMinutes, minutesToTime } from '@/lib/slots';
import { MOCK_SCHEDULE } from '@/lib/mock-data';
import 'react-day-picker/dist/style.css';

type Tab = 'inicio' | 'agenda' | 'clientes' | 'config';

function serviceColor(name: string | undefined): string {
  if (!name) return '#888';
  const n = name.toLowerCase();
  if (n.includes('mechas') || n.includes('balayage')) return '#fbbf24';
  if (n.includes('tinte') && n.includes('corte'))     return '#f472b6';
  if (n.includes('color'))                             return '#c084fc';
  if (n.includes('retoque'))                           return '#fb923c';
  if (n.includes('antifrizz') || n.includes('brazi')) return '#2dd4bf';
  if (n.includes('peinado'))                           return '#86efac';
  if (n.includes('corte'))                             return '#60a5fa';
  return '#81807F';
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

function waHref(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  const number = digits.length >= 12 ? digits : `52${digits.slice(-10)}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function WaButton({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-[9px] tracking-[0.1em] uppercase border border-emerald-600/40 text-emerald-700 px-2.5 py-1.5 hover:bg-emerald-50 transition-colors shrink-0">
      <MessageCircle size={9} /> {label}
    </a>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'confirmed')
    return <span className="text-[9px] tracking-[0.12em] uppercase text-emerald-700 border border-emerald-300 px-1.5 py-0.5">Confirmada</span>;
  if (status === 'cancelled')
    return <span className="text-[9px] tracking-[0.12em] uppercase text-black/30 border border-black/10 px-1.5 py-0.5">Cancelada</span>;
  if (status === 'pending_payment')
    return <span className="text-[9px] tracking-[0.12em] uppercase text-orange-600 border border-orange-300 px-1.5 py-0.5">Sin pagar</span>;
  return <span className="text-[9px] tracking-[0.12em] uppercase text-[#81807F] border border-[#81807F]/40 px-1.5 py-0.5">Pendiente</span>;
}

// ── Day timeline ─────────────────────────────────────────────────
interface TimelineRow {
  time: string;
  appt: Appointment | null;
  apptIsStart: boolean;
  block: BlockedSlot | null;
  blockIsStart: boolean;
  free: boolean;
}

function buildTimeline(date: Date, appts: Appointment[], blocks: BlockedSlot[]): TimelineRow[] {
  const dow = getDay(date);
  const sched = MOCK_SCHEDULE.find((s) => s.day_of_week === dow);
  if (!sched?.is_active) return [];

  const rows: TimelineRow[] = [];
  let cur = timeToMinutes(sched.start_time);
  const end = timeToMinutes(sched.end_time);
  let prevApptId: string | null = null;
  let prevBlockId: string | null = null;

  while (cur < end) {
    const t = minutesToTime(cur);
    const block = blocks.find((b) => {
      if (b.all_day) return true;
      if (!b.start_time || !b.end_time) return false;
      return cur >= timeToMinutes(b.start_time) && cur < timeToMinutes(b.end_time);
    }) ?? null;
    const appt = appts.find((a) =>
      cur >= timeToMinutes(a.start_time) && cur < timeToMinutes(a.end_time)
    ) ?? null;
    const apptIsStart  = !!appt  && appt.id  !== prevApptId;
    const blockIsStart = !!block && block.id !== prevBlockId;
    prevApptId  = appt?.id  ?? null;
    prevBlockId = block?.id ?? null;
    rows.push({ time: t, appt, apptIsStart, block, blockIsStart, free: !block && !appt });
    cur += 30;
  }
  return rows;
}

// ── Auth ─────────────────────────────────────────────────────────
function AuthScreen({ onAuth }: { onAuth: (password: string) => void }) {
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleAuth() {
    if (!pass || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/check', { headers: { 'x-admin-secret': pass } });
      if (res.ok) {
        onAuth(pass);
      } else {
        setError('Contraseña incorrecta');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 font-[family-name:var(--font-body)]" style={{ background: '#F7F5F2' }}>
      <div className="w-full max-w-xs">
        <p className="font-[family-name:var(--font-display)] text-3xl text-[#1C1A19] text-center mb-1 font-light">Admin</p>
        <p className="text-[10px] tracking-[0.4em] uppercase text-[#6B6560] text-center mb-10">Daniela Palacio Hair Room</p>
        <input
          type="password" value={pass}
          onChange={(e) => { setPass(e.target.value); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAuth(); }}
          placeholder="Contraseña"
          className="w-full bg-transparent border border-black/10 text-[#1C1A19] px-4 py-3 focus:outline-none focus:border-[#81807F]/60 transition-colors placeholder:text-black/25 mb-3"
          style={{ fontSize: '16px' }}
        />
        {error && <p className="text-red-400 text-[11px] tracking-wider text-center mb-3">{error}</p>}
        <button
          onClick={handleAuth}
          disabled={loading}
          className="w-full bg-[#F0EDE8] text-[#16181E] py-3.5 text-[11px] tracking-[0.25em] uppercase font-semibold hover:bg-[#E0DBD4] transition-colors disabled:opacity-60"
        >
          {loading ? 'Verificando...' : 'Entrar'}
        </button>
        <div className="text-center mt-6">
          <Link href="/" className="text-[#9A9590] text-xs hover:text-[#81807F] transition-colors tracking-wider">← Volver al sitio</Link>
        </div>
      </div>
    </div>
  );
}

// ── Inicio / Bitácora ─────────────────────────────────────────────
function InicioTab({ adminSecret }: { adminSecret: string }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading]           = useState(false);
  const [updating, setUpdating]         = useState<string | null>(null);
  const [msgConf, setMsgConf]           = useState(DEFAULT_SETTINGS.msg_confirmation);
  const [msgReminder, setMsgReminder]   = useState(DEFAULT_SETTINGS.msg_reminder_24h);
  const [search, setSearch]             = useState('');
  const [openProximas, setOpenProximas]       = useState(true);
  const [openRecordatorios, setOpenRecordatorios] = useState(true);
  const [openBitacora, setOpenBitacora]       = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [apptRes, settingsRes] = await Promise.all([
        fetch('/api/appointments', { headers: { 'x-admin-secret': adminSecret } }),
        fetch('/api/settings', { headers: { 'x-admin-secret': adminSecret } }),
      ]);
      const apptData     = await apptRes.json();
      const settingsData = await settingsRes.json();
      setAppointments(apptData.appointments ?? []);
      const s = { ...DEFAULT_SETTINGS, ...settingsData.settings };
      setMsgConf(s.msg_confirmation);
      setMsgReminder(s.msg_reminder_24h);
    } catch { /* keep */ }
    finally { setLoading(false); }
  }, [adminSecret]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: 'confirmed' | 'cancelled') => {
    setUpdating(id);
    try {
      await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
        body: JSON.stringify({ id, status }),
      });
      setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
    } finally { setUpdating(null); }
  };

  const needsAction = useMemo(() =>
    appointments
      .filter((a) => a.status === 'pending' || a.status === 'pending_payment')
      .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date) || a.start_time.localeCompare(b.start_time)),
    [appointments]
  );

  const recent = useMemo(() =>
    [...appointments]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 20),
    [appointments]
  );

  const todayKey    = format(startOfToday(), 'yyyy-MM-dd');
  const tomorrowKey = format(addDays(startOfToday(), 1), 'yyyy-MM-dd');
  const todayAppts    = appointments.filter((a) => a.appointment_date === todayKey    && a.status !== 'cancelled');
  const tomorrowAppts = appointments.filter((a) => a.appointment_date === tomorrowKey && a.status === 'confirmed');

  const monthKey = format(startOfToday(), 'yyyy-MM');
  const monthRevenue = appointments
    .filter((a) => a.status === 'confirmed' && a.appointment_date.startsWith(monthKey))
    .reduce((sum, a) => sum + ((a as unknown as Record<string, number>).deposit_amount ?? 0), 0);

  const upcoming = useMemo(() =>
    appointments
      .filter(a => a.appointment_date > todayKey && a.status !== 'cancelled')
      .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date) || a.start_time.localeCompare(b.start_time))
      .slice(0, 20),
    [appointments, todayKey]
  );
  const upcomingByDate = useMemo(() => {
    const grouped: Record<string, Appointment[]> = {};
    for (const a of upcoming) {
      if (!grouped[a.appointment_date]) grouped[a.appointment_date] = [];
      grouped[a.appointment_date].push(a);
    }
    return grouped;
  }, [upcoming]);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-4 h-4 border border-[#81807F] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8">

      {/* ── Quick access ── */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { id: 'sec-proximas',      label: 'Próximas citas',  color: '#3B82F6', bg: '#EFF6FF', count: upcoming.length },
          { id: 'sec-atencion',      label: 'Req. atención',   color: '#EF4444', bg: '#FEF2F2', count: needsAction.length },
          { id: 'sec-recordatorios', label: 'Recordatorios',   color: '#F59E0B', bg: '#FFFBEB', count: tomorrowAppts.length },
          { id: 'sec-bitacora',      label: 'Bitácora',        color: '#10B981', bg: '#ECFDF5', count: null },
        ].map(({ id, label, color, bg, count }) => (
          <button key={id} onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="text-left p-3 rounded-sm hover:opacity-80 active:opacity-60 transition-opacity"
            style={{ background: bg, border: `1px solid ${color}30` }}>
            <span className="block text-[10px] tracking-[0.15em] uppercase font-medium" style={{ color }}>
              {label}
            </span>
            {count !== null && (
              <span className="block text-xl font-light mt-0.5" style={{ color, fontFamily: 'var(--font-display)' }}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px border border-black/8">
        {[
          { label: 'Hoy',          val: todayAppts.length,                                      color: '#1C1A19' },
          { label: 'Sin confirmar', val: needsAction.length,                                    color: needsAction.length > 0 ? '#fb923c' : '#9A9590' },
          { label: 'Total activas', val: appointments.filter((a) => a.status !== 'cancelled').length, color: '#81807F' },
          { label: 'Este mes', val: `$${monthRevenue.toLocaleString('es-MX')}`, color: '#81807F' },
        ].map((s) => (
          <div key={s.label} className="p-4 text-center" style={{ background: '#FFFFFF' }}>
            <div className="font-[family-name:var(--font-display)] text-3xl font-light mb-1" style={{ color: s.color }}>{s.val}</div>
            <div className="text-[9px] tracking-[0.2em] uppercase text-[#9A9590]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Próximas citas ── */}
      {Object.keys(upcomingByDate).length > 0 && (
        <div id="sec-proximas" className="border border-black/5">
          <button
            onClick={() => setOpenProximas(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-black/4 transition-colors"
          >
            <span className="text-[10px] tracking-[0.3em] uppercase text-[#6B6560]">
              Próximas citas <span className="text-[#B0AAA5]">· {upcoming.length}</span>
            </span>
            <ArrowRight size={12} className={`text-[#B0AAA5] transition-transform duration-200 ${openProximas ? 'rotate-90' : ''}`} />
          </button>
          {openProximas && (
            <div className="px-4 pb-4 space-y-4 border-t border-black/5 pt-4">
              {Object.keys(upcomingByDate).sort().map((date) => {
                const dt = parseISO(date + 'T12:00:00');
                const label = isTomorrow(dt) ? 'Mañana' : format(dt, "EEE d MMM", { locale: es });
                return (
                  <div key={date}>
                    <p className="text-[9px] tracking-[0.2em] uppercase text-[#81807F] mb-1 capitalize">{label} · {format(dt, "d 'de' MMMM", { locale: es })}</p>
                    {upcomingByDate[date].map(apt => (
                      <div key={apt.id} className="flex items-center justify-between py-2.5 border-b border-black/5"
                        style={{ borderLeft: `3px solid ${serviceColor(apt.dp_services?.name)}`, paddingLeft: '10px' }}>
                        <div>
                          <p className="text-[#1C1A19] text-sm">{apt.client_name}</p>
                          <p className="text-[#6B6560] text-xs">{apt.dp_services?.name ?? '—'} · {formatTime(apt.start_time)}</p>
                        </div>
                        <StatusBadge status={apt.status} />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Recordatorios de mañana ── */}
      {tomorrowAppts.length > 0 && (
        <div id="sec-recordatorios" className="border border-black/5">
          <button
            onClick={() => setOpenRecordatorios(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-black/4 transition-colors"
          >
            <span className="text-[10px] tracking-[0.3em] uppercase flex items-center gap-2 text-[#81807F]">
              <Bell size={11} /> Recordatorios de mañana <span className="text-[#6B6560] ml-1">· {tomorrowAppts.length}</span>
            </span>
            <ArrowRight size={12} className={`text-[#B0AAA5] transition-transform duration-200 ${openRecordatorios ? 'rotate-90' : ''}`} />
          </button>
          {openRecordatorios && (
            <div className="px-4 pb-4 border-t border-black/5 pt-4 space-y-2">
              {tomorrowAppts.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between gap-3 py-3 border-b border-black/5"
                  style={{ borderLeft: `3px solid ${serviceColor(apt.dp_services?.name)}`, paddingLeft: '12px' }}>
                  <div className="min-w-0">
                    <p className="text-[#1C1A19] text-sm">{apt.client_name}</p>
                    <p className="text-[#6B6560] text-xs">{apt.dp_services?.name ?? '—'} · {formatTime(apt.start_time)}</p>
                  </div>
                  <WaButton href={waHref(apt.client_phone, fillTemplate(msgReminder, apt))} label="Recordatorio" />
                </div>
              ))}
              <p className="text-[#B0AAA5] text-[10px] pt-1">El botón abre WhatsApp con el mensaje pre-llenado listo para enviar.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Requieren atención ── */}
      {needsAction.length > 0 && (
        <div id="sec-atencion">
          <p className="text-[10px] tracking-[0.3em] uppercase mb-4 flex items-center gap-2" style={{ color: '#fb923c' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            Requieren atención · {needsAction.length}
          </p>
          <div className="space-y-2">
            {needsAction.map((apt) => {
              const color = serviceColor(apt.dp_services?.name);
              const dtStr = isToday(parseISO(apt.appointment_date + 'T12:00:00')) ? 'Hoy'
                : isTomorrow(parseISO(apt.appointment_date + 'T12:00:00')) ? 'Mañana'
                : format(parseISO(apt.appointment_date + 'T12:00:00'), "EEE d MMM", { locale: es });
              return (
                <div key={apt.id} className="border border-orange-200 p-4"
                  style={{ background: 'rgba(251,146,60,0.03)', borderLeft: `3px solid ${color}` }}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[#1C1A19] text-sm font-medium">{apt.client_name}</span>
                        <StatusBadge status={apt.status} />
                      </div>
                      <p className="text-[#6B6560] text-xs mb-0.5">{apt.dp_services?.name ?? '—'}</p>
                      <p className="text-[#6B6560] text-xs">
                        {dtStr} · {formatTime(apt.start_time)} – {formatTime(apt.end_time)}
                      </p>
                      <a href={`https://wa.me/52${apt.client_phone.replace(/\D/g, '')}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[#9A9590] hover:text-[#25D366] transition-colors text-xs mt-1 w-fit">
                        <Phone size={10} /> {apt.client_phone}
                      </a>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <WaButton href={waHref(apt.client_phone, fillTemplate(msgConf, apt))} label="Enviar WA" />
                      <button onClick={() => updateStatus(apt.id, 'confirmed')} disabled={updating === apt.id}
                        className="flex items-center gap-1 text-[9px] tracking-[0.12em] uppercase border border-emerald-300 text-emerald-700 px-3 py-1.5 hover:bg-emerald-50 transition-colors disabled:opacity-40">
                        <Check size={10} /> Confirmar
                      </button>
                      <button onClick={() => updateStatus(apt.id, 'cancelled')} disabled={updating === apt.id}
                        className="flex items-center gap-1 text-[9px] tracking-[0.12em] uppercase border border-red-300 text-red-500 px-3 py-1.5 hover:bg-red-50 transition-colors disabled:opacity-40">
                        <X size={10} /> No aceptar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Bitácora ── */}
      <div id="sec-bitacora" className="border border-black/5">
        <button
          onClick={() => setOpenBitacora(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-black/4 transition-colors"
        >
          <span className="text-[10px] tracking-[0.3em] uppercase text-[#6B6560]">Bitácora · últimas reservas</span>
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <button onClick={load} disabled={loading} className="text-[#9A9590] hover:text-[#81807F] transition-colors p-0.5">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
            <ArrowRight size={12} className={`text-[#B0AAA5] transition-transform duration-200 pointer-events-none ${openBitacora ? 'rotate-90' : ''}`} />
          </div>
        </button>
        {openBitacora && (
        <div className="px-4 pb-4 border-t border-black/5 pt-4">
        <input
          type="text" value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar clienta..."
          className="w-full bg-transparent border border-black/8 text-[#1C1A19] px-3 py-2 text-sm focus:outline-none focus:border-[#81807F]/40 placeholder:text-black/25 mb-4"
          style={{ fontSize: '16px' }}
        />

        {(() => {
          const filteredRecent = search.trim()
            ? recent.filter((a) => a.client_name.toLowerCase().includes(search.toLowerCase()))
            : recent;
          return filteredRecent.length === 0 ? (
            <div className="border border-black/5 py-14 text-center">
              <p className="text-[#9A9590] text-sm">
                {search.trim() ? 'Sin resultados para esta búsqueda.' : 'No hay reservas registradas.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-black/5">
              {filteredRecent.map((apt) => {
                const color = serviceColor(apt.dp_services?.name);
                const dtStr = isToday(parseISO(apt.appointment_date + 'T12:00:00')) ? 'Hoy'
                  : isTomorrow(parseISO(apt.appointment_date + 'T12:00:00')) ? 'Mañana'
                  : format(parseISO(apt.appointment_date + 'T12:00:00'), "d MMM", { locale: es });
                const ago = formatDistanceToNow(parseISO(apt.created_at), { locale: es, addSuffix: true });
                return (
                  <div key={apt.id} className="py-3.5 flex items-start gap-3"
                    style={{ borderLeft: `2px solid ${color}40`, paddingLeft: '12px' }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-[#1C1A19] text-sm">{apt.client_name}</span>
                        <StatusBadge status={apt.status} />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[#6B6560] text-xs">{apt.dp_services?.name ?? '—'}</span>
                        <span className="text-[#B0AAA5] text-xs">·</span>
                        <span className="text-[#6B6560] text-xs">{dtStr} {formatTime(apt.start_time)}</span>
                      </div>
                    </div>
                    <span className="text-[#B0AAA5] text-[10px] shrink-0 mt-0.5">{ago}</span>
                  </div>
                );
              })}
            </div>
          );
        })()}
        </div>
        )}
      </div>

    </div>
  );
}

// ── Agenda (Calendar + Appointments combined) ─────────────────────
function AgendaTab({ adminSecret }: { adminSecret: string }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blocks, setBlocks]             = useState<BlockedSlot[]>([]);
  const [loading, setLoading]           = useState(false);
  const [updating, setUpdating]         = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Block form
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [allDay, setAllDay]         = useState(true);
  const [blockStart, setBlockStart] = useState('10:00');
  const [blockEnd, setBlockEnd]     = useState('14:00');
  const [blockReason, setBlockReason] = useState('');

  const [msgReminder, setMsgReminder] = useState(DEFAULT_SETTINGS.msg_reminder_24h);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [apptRes, blockRes, settingsRes] = await Promise.all([
        fetch('/api/appointments', { headers: { 'x-admin-secret': adminSecret } }),
        fetch('/api/blocked-slots', { headers: { 'x-admin-secret': adminSecret } }),
        fetch('/api/settings', { headers: { 'x-admin-secret': adminSecret } }),
      ]);
      const apptData     = await apptRes.json();
      const blockData    = await blockRes.json();
      const settingsData = await settingsRes.json();
      setAppointments(apptData.appointments ?? []);
      setBlocks(blockData.blocks ?? []);
      const s = { ...DEFAULT_SETTINGS, ...settingsData.settings };
      setMsgReminder(s.msg_reminder_24h);
    } catch { /* keep */ }
    finally { setLoading(false); }
  }, [adminSecret]);

  useEffect(() => { loadData(); }, [loadData]);

  // Heat map
  const apptCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of appointments) {
      if (a.status !== 'cancelled')
        counts[a.appointment_date] = (counts[a.appointment_date] ?? 0) + 1;
    }
    return counts;
  }, [appointments]);

  const workingDays = useMemo(() => {
    const days: Date[] = [];
    const today = startOfToday();
    for (let i = 0; i <= 60; i++) {
      const d = addDays(today, i);
      const s = MOCK_SCHEDULE.find((s) => s.day_of_week === getDay(d));
      if (s?.is_active) days.push(d);
    }
    return days;
  }, []);

  const { libre, poco, medio, lleno, blockedDates } = useMemo(() => {
    const libre: Date[] = [], poco: Date[] = [], medio: Date[] = [], lleno: Date[] = [];
    workingDays.forEach((d) => {
      const key = format(d, 'yyyy-MM-dd');
      const c = apptCounts[key] ?? 0;
      if (c === 0)     libre.push(d);
      else if (c <= 2) poco.push(d);
      else if (c <= 4) medio.push(d);
      else             lleno.push(d);
    });
    return {
      libre, poco, medio, lleno,
      blockedDates: blocks.filter(b => b.all_day).map((b) => new Date(b.block_date + 'T12:00:00')),
    };
  }, [workingDays, apptCounts, blocks]);

  // Selected day data
  const selectedKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;

  const dayAppointments = useMemo(() =>
    appointments
      .filter((a) => a.appointment_date === selectedKey && a.status !== 'cancelled')
      .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [appointments, selectedKey]
  );

  const dayBlocks = useMemo(() =>
    blocks.filter((b) => b.block_date === selectedKey),
    [blocks, selectedKey]
  );

  const timeline = useMemo(() => {
    if (!selectedDate) return [];
    return buildTimeline(selectedDate, dayAppointments, dayBlocks);
  }, [selectedDate, dayAppointments, dayBlocks]);

  // Upcoming (no day selected) — next 14 days
  const upcoming = useMemo(() => {
    const today = format(startOfToday(), 'yyyy-MM-dd');
    const limit  = format(addDays(startOfToday(), 30), 'yyyy-MM-dd');
    return appointments
      .filter((a) => a.appointment_date >= today && a.appointment_date <= limit && a.status !== 'cancelled')
      .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date) || a.start_time.localeCompare(b.start_time));
  }, [appointments]);

  const upcomingByDate = useMemo(() => {
    const grouped: Record<string, Appointment[]> = {};
    for (const a of upcoming) {
      if (!grouped[a.appointment_date]) grouped[a.appointment_date] = [];
      grouped[a.appointment_date].push(a);
    }
    return grouped;
  }, [upcoming]);

  const updateStatus = async (id: string, status: 'confirmed' | 'cancelled') => {
    setUpdating(id);
    try {
      await fetch('/api/admin', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
        body: JSON.stringify({ id, status }),
      });
      setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
    } finally { setUpdating(null); }
  };

  const handleBlock = async () => {
    if (!selectedDate) return;
    setSaving(true);
    try {
      const res = await fetch('/api/blocked-slots', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
        body: JSON.stringify({
          block_date: format(selectedDate, 'yyyy-MM-dd'),
          all_day: allDay,
          start_time: allDay ? null : blockStart,
          end_time:   allDay ? null : blockEnd,
          reason: blockReason.trim() || null,
        }),
      });
      if (res.ok) {
        const block = await res.json();
        setBlocks((prev) => [...prev, block]);
        setShowBlockForm(false); setBlockReason(''); setAllDay(true);
      }
    } finally { setSaving(false); }
  };

  const handleDeleteBlock = async (id: string) => {
    setDeleting(id);
    try {
      await fetch('/api/blocked-slots', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
        body: JSON.stringify({ id }),
      });
      setBlocks((prev) => prev.filter((b) => b.id !== id));
    } finally { setDeleting(null); }
  };

  const dayLabel = (dateStr: string) => {
    const dt = parseISO(dateStr + 'T12:00:00');
    if (isToday(dt))    return 'Hoy';
    if (isTomorrow(dt)) return 'Mañana';
    return format(dt, "EEE d MMM", { locale: es });
  };

  // Stats
  const sinPagar    = appointments.filter((a) => a.status === 'pending_payment').length;
  const confirmadas = appointments.filter((a) => a.status === 'confirmed').length;
  const pendientes  = appointments.filter((a) => a.status === 'pending').length;

  return (
    <div>
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-px border border-black/8 mb-6">
        {[
          { label: 'Sin pagar',   val: sinPagar,    color: '#fb923c' },
          { label: 'Confirmadas', val: confirmadas, color: '#4ade80' },
          { label: 'Pendientes',  val: pendientes,  color: '#81807F' },
        ].map((s) => (
          <div key={s.label} className="p-3 text-center" style={{ background: '#FFFFFF' }}>
            <div className="font-[family-name:var(--font-display)] text-2xl font-light mb-0.5" style={{ color: s.color }}>{s.val}</div>
            <div className="text-[9px] tracking-[0.2em] uppercase text-[#9A9590]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Main 2-panel layout */}
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 md:gap-8">

        {/* LEFT — Calendar */}
        <div className="md:w-[300px]">
          {/* Heat map legend */}
          <div className="flex items-center gap-3 flex-wrap mb-3">
            {[
              { label: 'Libre',  color: '#4ade80' },
              { label: '1–2',    color: '#facc15' },
              { label: '3–4',    color: '#fb923c' },
              { label: '5+',     color: '#f87171' },
              { label: 'Bloq.',  color: '#9A9590', strike: true },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: l.color, opacity: l.strike ? 0.4 : 1 }} />
                <span className="text-[9px] tracking-wider uppercase" style={{ color: l.strike ? '#9A9590' : l.color }}>{l.label}</span>
              </div>
            ))}
            <button onClick={loadData} disabled={loading} className="ml-auto text-[#9A9590] hover:text-[#81807F] transition-colors">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* DayPicker */}
          <div className="border border-black/8 overflow-x-auto">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={es}
              modifiers={{ libre, poco, medio, lleno, blocked: blockedDates }}
              modifiersStyles={{
                libre:    { color: '#4ade80', fontWeight: '500' },
                poco:     { color: '#facc15' },
                medio:    { color: '#fb923c' },
                lleno:    { color: '#f87171' },
                blocked:  { color: '#9A9590', textDecoration: 'line-through' },
                selected: { backgroundColor: 'transparent', color: '#1C1A19', fontWeight: '700', outline: 'none', boxShadow: 'none' },
                today:    { color: '#81807F', fontWeight: '600', outline: 'none', boxShadow: 'none' },
              }}
              styles={{
                day:           { color: '#1C1A19', borderRadius: '0', minWidth: '44px', minHeight: '44px', fontFamily: 'var(--font-body)' },
                caption_label: { color: '#1C1A19', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', fontSize: '0.75rem', fontWeight: '300', textTransform: 'uppercase' },
                weekday:       { color: '#9A9590', textTransform: 'uppercase', fontSize: '0.5rem', letterSpacing: '0.15em', fontWeight: '400' },
                root:          { background: 'transparent', padding: '12px' },
                nav:           { gap: '4px' },
              }}
            />
          </div>

          {/* Service color legend */}
          <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1">
            {[
              { label: 'Corte',     color: '#60a5fa' },
              { label: 'Color',     color: '#c084fc' },
              { label: 'Mechas',    color: '#fbbf24' },
              { label: 'Retoque',   color: '#fb923c' },
              { label: 'Antifrizz', color: '#2dd4bf' },
              { label: 'T+Corte',   color: '#f472b6' },
              { label: 'Peinado',   color: '#86efac' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                <span className="text-[9px] uppercase tracking-wider text-[#9A9590]">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Day detail or upcoming list */}
        <div className="min-w-0">

          {selectedDate ? (
            /* ── SELECTED DAY DETAIL ── */
            <div>
              {/* Day header */}
              <div className="flex items-baseline justify-between mb-5">
                <div>
                  <p className="font-[family-name:var(--font-display)] text-2xl font-light text-[#1C1A19] capitalize">
                    {isToday(selectedDate) ? 'Hoy' : isTomorrow(selectedDate) ? 'Mañana'
                      : format(selectedDate, "EEEE", { locale: es })}
                  </p>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-[#6B6560] capitalize">
                    {format(selectedDate, "d 'de' MMMM yyyy", { locale: es })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDate(undefined)}
                  className="text-[9px] tracking-[0.15em] uppercase text-[#9A9590] hover:text-[#6B6560] transition-colors border border-black/8 px-2 py-1"
                >
                  Ver todos
                </button>
              </div>

              {/* Full day timeline */}
              {timeline.length === 0 ? (
                <div className="border border-black/5 py-10 text-center mb-6">
                  <CalendarOff size={18} className="text-black/10 mx-auto mb-2" />
                  <p className="text-[#9A9590] text-sm">Día no laborable</p>
                </div>
              ) : (
                <div className="mb-6 border border-black/5">
                  {timeline.map((row, i) => {
                    const color = row.appt ? serviceColor(row.appt.dp_services?.name) : null;

                    /* ── Appointment start ── */
                    if (row.appt && row.apptIsStart) {
                      const apt = row.appt;
                      return (
                        <div
                          key={i}
                          className="border-b border-black/5 py-3"
                          style={{ borderLeft: `3px solid ${color}`, paddingLeft: '12px' }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[#81807F] text-xs font-medium">{formatTime(row.time)}</span>
                            <span className="text-[#9A9590] text-xs">→ {formatTime(apt.end_time)}</span>
                            <StatusBadge status={apt.status} />
                          </div>
                          <p className="text-[#1C1A19] text-sm mb-0.5">{apt.client_name}</p>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color! }} />
                            <span className="text-[#6B6560] text-xs">{apt.dp_services?.name ?? '—'}</span>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap mt-1">
                            <a
                              href={`https://wa.me/52${apt.client_phone.replace(/\D/g, '')}`}
                              target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[#9A9590] hover:text-[#25D366] transition-colors text-xs"
                            >
                              <Phone size={10} /> {apt.client_phone}
                            </a>
                            <WaButton href={waHref(apt.client_phone, fillTemplate(msgReminder, apt))} label="Recordatorio WA" />
                          </div>
                          {apt.notes && <p className="text-[#9A9590] text-[11px] italic mt-1">{apt.notes}</p>}
                          {(apt.status === 'pending' || apt.status === 'pending_payment') && (
                            <div className="flex gap-2 mt-3">
                              <button onClick={() => updateStatus(apt.id, 'confirmed')} disabled={updating === apt.id}
                                className="flex items-center gap-1 text-[9px] tracking-[0.12em] uppercase border border-emerald-300 text-emerald-700 px-2.5 py-1.5 hover:bg-emerald-50 transition-colors disabled:opacity-40">
                                <Check size={10} /> Confirmar
                              </button>
                              <button onClick={() => updateStatus(apt.id, 'cancelled')} disabled={updating === apt.id}
                                className="flex items-center gap-1 text-[9px] tracking-[0.12em] uppercase border border-red-300 text-red-500 px-2.5 py-1.5 hover:bg-red-50 transition-colors disabled:opacity-40">
                                <X size={10} /> No aceptar
                              </button>
                            </div>
                          )}
                          {apt.status === 'confirmed' && (
                            <button onClick={() => updateStatus(apt.id, 'cancelled')} disabled={updating === apt.id}
                              className="mt-3 flex items-center gap-1 text-[9px] tracking-[0.12em] uppercase border border-black/8 text-[#9A9590] px-2.5 py-1.5 hover:border-red-300 hover:text-red-500 transition-colors disabled:opacity-40">
                              <X size={10} /> Cancelar cita
                            </button>
                          )}
                        </div>
                      );
                    }

                    /* ── Appointment continuation — hidden ── */
                    if (row.appt && !row.apptIsStart) return null;

                    /* ── Block start ── */
                    if (row.block && row.blockIsStart) {
                      const blk = row.block;
                      return (
                        <div key={i} className="flex items-center justify-between py-2.5 border-b border-black/5"
                          style={{ borderLeft: '3px solid rgba(239,68,68,0.5)', paddingLeft: '12px', background: 'rgba(239,68,68,0.03)' }}>
                          <div>
                            <span className="text-red-500/80 text-xs">
                              {blk.all_day ? 'Día completo bloqueado' : formatTime(row.time)}
                            </span>
                            {!blk.all_day && blk.end_time && (
                              <span className="text-[#6B6560] text-xs ml-1">→ {formatTime(blk.end_time)}</span>
                            )}
                            {blk.reason && <span className="text-[#9A9590] text-xs ml-2">· {blk.reason}</span>}
                          </div>
                          <button onClick={() => handleDeleteBlock(blk.id)} disabled={deleting === blk.id}
                            className="text-[#B0AAA5] hover:text-red-500 transition-colors disabled:opacity-40 p-1 ml-3 shrink-0">
                            {deleting === blk.id
                              ? <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                              : <Trash2 size={12} />}
                          </button>
                        </div>
                      );
                    }

                    /* ── Block continuation — hidden ── */
                    if (row.block && !row.blockIsStart) return null;

                    /* ── Free slot ── */
                    return (
                      <div key={i} className="flex items-center gap-3 py-2 border-b border-black/[0.03]"
                        style={{ paddingLeft: '15px' }}>
                        <span className="text-[#C0BBB6] text-[10px] w-16 shrink-0">{formatTime(row.time)}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full" style={{ background: '#a3d9a5' }} />
                          <span className="text-[10px] tracking-[0.08em] uppercase" style={{ color: '#6aaf6c' }}>libre</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Block form for this day */}
              {!showBlockForm ? (
                <button
                  onClick={() => setShowBlockForm(true)}
                  className="flex items-center gap-2 text-[9px] tracking-[0.15em] uppercase border border-black/8 text-[#6B6560] px-3 py-2 hover:border-red-300 hover:text-red-500 transition-colors"
                >
                  <CalendarOff size={12} /> Bloquear horas de este día
                </button>
              ) : (
                <div className="border border-black/8 p-4 mt-2">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-[#6B6560]">Bloquear horario</p>
                    <button onClick={() => { setShowBlockForm(false); setBlockReason(''); }} className="text-[#9A9590] hover:text-[#1C1A19] transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex gap-2 mb-4">
                    {[{ v: true, l: 'Día completo' }, { v: false, l: 'Rango de horas' }].map(({ v, l }) => (
                      <button key={l} onClick={() => setAllDay(v)}
                        className={`flex-1 py-2 text-[9px] tracking-[0.12em] uppercase border transition-colors ${allDay === v ? 'border-[#81807F]/50 text-[#81807F]' : 'border-black/8 text-[#6B6560] hover:border-black/20'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                  {!allDay && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {[{ label: 'Desde', val: blockStart, set: setBlockStart }, { label: 'Hasta', val: blockEnd, set: setBlockEnd }].map(({ label, val, set }) => (
                        <div key={label}>
                          <label className="block text-[9px] tracking-[0.15em] uppercase text-[#6B6560] mb-1.5">{label}</label>
                          <input type="time" value={val} onChange={(e) => set(e.target.value)}
                            className="w-full bg-transparent border border-black/10 text-[#1C1A19] px-3 py-2 text-sm focus:outline-none focus:border-[#81807F]/50" style={{ fontSize: '16px' }} />
                        </div>
                      ))}
                    </div>
                  )}
                  <input type="text" value={blockReason} onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Motivo (opcional)"
                    className="w-full bg-transparent border border-black/10 text-[#1C1A19] px-3 py-2.5 text-sm focus:outline-none focus:border-[#81807F]/50 placeholder:text-black/25 mb-4" style={{ fontSize: '16px' }} />
                  <button onClick={handleBlock} disabled={saving}
                    className="w-full flex items-center justify-center gap-2 border border-red-300 text-red-500 py-3 text-[10px] tracking-[0.15em] uppercase hover:bg-red-50 transition-colors disabled:opacity-40">
                    {saving ? <div className="w-3.5 h-3.5 border border-red-500 border-t-transparent rounded-full animate-spin" /> : <CalendarOff size={12} />}
                    {saving ? 'Bloqueando...' : 'Confirmar bloqueo'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ── NO DAY SELECTED: UPCOMING LIST ── */
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#6B6560] mb-5">Próximas citas</p>
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-4 h-4 border border-[#81807F] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : Object.keys(upcomingByDate).length === 0 ? (
                <div className="border border-black/5 py-16 text-center">
                  <p className="text-[#9A9590] text-sm">No hay citas próximas.</p>
                  <p className="text-[#B0AAA5] text-xs mt-1">Selecciona un día en el calendario para ver o gestionar.</p>
                </div>
              ) : (
                <div>
                  {Object.keys(upcomingByDate).sort().map((date, di) => (
                    <div key={date} className={di > 0 ? 'mt-8' : ''}>
                      <button
                        onClick={() => setSelectedDate(parseISO(date + 'T12:00:00'))}
                        className="flex items-baseline gap-2 mb-3 group w-full text-left"
                      >
                        <span className="font-[family-name:var(--font-display)] text-xl font-light text-[#1C1A19] group-hover:text-[#81807F] transition-colors capitalize">
                          {dayLabel(date)}
                        </span>
                        <span className="text-[10px] tracking-[0.15em] uppercase text-[#9A9590] capitalize">
                          {format(parseISO(date + 'T12:00:00'), "d 'de' MMMM", { locale: es })}
                        </span>
                        <span className="ml-auto text-[9px] text-[#B0AAA5]">
                          {upcomingByDate[date].length} cita{upcomingByDate[date].length !== 1 ? 's' : ''}
                        </span>
                      </button>
                      <div>
                        {upcomingByDate[date].map((apt) => {
                          const color = serviceColor(apt.dp_services?.name);
                          return (
                            <div
                              key={apt.id}
                              className="border-b border-black/5 py-3 cursor-pointer hover:bg-black/[0.01] transition-colors"
                              style={{ borderLeft: `3px solid ${color}`, paddingLeft: '12px' }}
                              onClick={() => setSelectedDate(parseISO(date + 'T12:00:00'))}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-[#1C1A19] text-xs font-medium shrink-0">{formatTime(apt.start_time)}</span>
                                  <span className="text-[#1C1A19] text-sm truncate">{apt.client_name}</span>
                                  <span className="text-[#6B6560] text-xs hidden sm:inline truncate">{apt.dp_services?.name}</span>
                                </div>
                                <StatusBadge status={apt.status} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Services tab ─────────────────────────────────────────────────
interface ServiceRow {
  id: string; name: string; description: string | null;
  price: number | null; duration_minutes: number; active_minutes: number;
  deposit_amount: number; active: boolean; sort_order: number;
}
type FormState = {
  name: string; description: string; price: string;
  duration_minutes: string; active_minutes: string; deposit_amount: string;
};
const EMPTY_FORM: FormState = { name: '', description: '', price: '', duration_minutes: '', active_minutes: '', deposit_amount: '200' };

// Defined at module level so React never remounts it on parent re-render
interface ServiceFormProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSave: (id?: string) => void;
  onCancel: () => void;
  saving: boolean;
  id?: string;
}
function ServiceForm({ form, setForm, onSave, onCancel, saving, id }: ServiceFormProps) {
  const field = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));
  const dur = parseInt(form.duration_minutes) || 0;
  const act = parseInt(form.active_minutes)   || 0;
  const gap = Math.max(0, dur - act);
  return (
    <div className="border border-black/10 p-4 mt-1 mb-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div className="sm:col-span-2">
          <label className="block text-[10px] tracking-[0.15em] uppercase text-[#6B6560] mb-1.5">Nombre *</label>
          <input type="text" value={form.name} onChange={field('name')} placeholder="Ej: Mechas / Balayage"
            className="w-full bg-transparent border border-black/10 text-[#1C1A19] px-3 py-2.5 focus:outline-none focus:border-[#81807F]/50 placeholder:text-black/25" style={{ fontSize: '16px' }} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[10px] tracking-[0.15em] uppercase text-[#6B6560] mb-1.5">Descripción <span className="normal-case tracking-normal text-[#B0AAA5]">— opcional</span></label>
          <input type="text" value={form.description} onChange={field('description')} placeholder="Breve descripción para la clienta"
            className="w-full bg-transparent border border-black/10 text-[#1C1A19] px-3 py-2.5 focus:outline-none focus:border-[#81807F]/50 placeholder:text-black/25" style={{ fontSize: '16px' }} />
        </div>
        <div>
          <label className="block text-[10px] tracking-[0.15em] uppercase text-[#6B6560] mb-1.5">Precio total (MXN) *</label>
          <input type="number" value={form.price} onChange={field('price')} placeholder="1400"
            className="w-full bg-transparent border border-black/10 text-[#1C1A19] px-3 py-2.5 focus:outline-none focus:border-[#81807F]/50 placeholder:text-black/25" style={{ fontSize: '16px' }} />
        </div>
        <div>
          <label className="block text-[10px] tracking-[0.15em] uppercase text-[#6B6560] mb-1.5">Anticipo (MXN)</label>
          <input type="number" value={form.deposit_amount} onChange={field('deposit_amount')} placeholder="200"
            className="w-full bg-transparent border border-black/10 text-[#1C1A19] px-3 py-2.5 focus:outline-none focus:border-[#81807F]/50 placeholder:text-black/25" style={{ fontSize: '16px' }} />
        </div>
        <div>
          <label className="block text-[10px] tracking-[0.15em] uppercase text-[#6B6560] mb-1.5">Duración total (min) *</label>
          <input type="number" value={form.duration_minutes} onChange={field('duration_minutes')} placeholder="240"
            className="w-full bg-transparent border border-black/10 text-[#1C1A19] px-3 py-2.5 focus:outline-none focus:border-[#81807F]/50 placeholder:text-black/25" style={{ fontSize: '16px' }} />
        </div>
        <div>
          <label className="block text-[10px] tracking-[0.15em] uppercase text-[#6B6560] mb-1.5">Tiempo contigo (min) *</label>
          <input type="number" value={form.active_minutes} onChange={field('active_minutes')} placeholder="120"
            className="w-full bg-transparent border border-black/10 text-[#1C1A19] px-3 py-2.5 focus:outline-none focus:border-[#81807F]/50 placeholder:text-black/25" style={{ fontSize: '16px' }} />
        </div>
      </div>
      {dur > 0 && act > 0 && (
        <div className="mb-4 p-3 border border-black/5" style={{ background: '#F3F1EE' }}>
          <div className="flex h-1.5 mb-2 overflow-hidden">
            <div style={{ width: `${Math.min(100, (act / dur) * 100)}%`, background: '#81807F' }} />
            {gap > 0 && <div style={{ width: `${(gap / dur) * 100}%`, background: '#D8D4CF', borderLeft: '1px solid #C0BBB6' }} />}
          </div>
          <div className="flex justify-between text-[9px] tracking-[0.12em] uppercase">
            <span style={{ color: '#81807F' }}>{formatDuration(act)} contigo</span>
            {gap > 0 && <span style={{ color: '#B0AAA5' }}>{formatDuration(gap)} procesando</span>}
          </div>
          {gap > 0 && (
            <p className="text-[10px] mt-1.5" style={{ color: '#6B6560' }}>
              Puedes recibir otra cita {formatDuration(act)} después del inicio de esta
            </p>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={() => onSave(id)} disabled={saving}
          className="flex items-center gap-2 bg-[#F0EDE8] text-[#16181E] px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase font-semibold hover:bg-[#E0DBD4] transition-colors disabled:opacity-40">
          {saving ? <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Check size={12} />}
          {saving ? 'Guardando...' : id ? 'Actualizar' : 'Crear servicio'}
        </button>
        <button onClick={onCancel}
          className="px-4 py-2.5 text-[10px] tracking-[0.2em] uppercase text-[#6B6560] border border-black/8 hover:text-[#1C1A19] transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function ServicesTab({ adminSecret }: { adminSecret: string }) {
  const [services, setServices]   = useState<ServiceRow[]>([]);
  const [loading, setLoading]     = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [form, setForm]           = useState<FormState>(EMPTY_FORM);
  const [svcError, setSvcError]   = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/services');
      const data = await res.json();
      setServices(data.services ?? []);
    } catch { setServices([]); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const startEdit = (svc: ServiceRow) => {
    setEditingId(svc.id); setShowAdd(false);
    setForm({ name: svc.name, description: svc.description ?? '', price: svc.price != null ? String(svc.price) : '',
      duration_minutes: String(svc.duration_minutes), active_minutes: String(svc.active_minutes),
      deposit_amount: String(svc.deposit_amount) });
  };
  const cancel = () => { setEditingId(null); setShowAdd(false); setForm(EMPTY_FORM); };

  const handleSave = useCallback(async (id?: string) => {
    setSvcError('');
    const dur = parseInt(form.duration_minutes);
    const act = parseInt(form.active_minutes);
    if (!form.name.trim() || !form.price || !dur || !act) return;
    if (act > dur) { setSvcError('El tiempo activo no puede superar la duración total'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), description: form.description.trim() || null,
        price: parseFloat(form.price), duration_minutes: dur, active_minutes: act,
        deposit_amount: parseFloat(form.deposit_amount) || 200 };
      const res = await fetch('/api/services', {
        method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
        body: JSON.stringify(id ? { id, ...payload } : payload),
      });
      if (res.ok) { await load(); cancel(); }
      else { const e = await res.json(); setSvcError(e.error ?? 'Error al guardar'); }
    } finally { setSaving(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, load]);

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return; }
    setConfirmDeleteId(null);
    setDeleting(id);
    try {
      await fetch('/api/services', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
        body: JSON.stringify({ id }) });
      setServices((prev) => prev.filter((s) => s.id !== id));
    } finally { setDeleting(null); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-[#6B6560] text-sm leading-relaxed">
          Gestiona los servicios, precios y tiempos. El <span style={{ color: '#81807F' }}>tiempo contigo</span> define cuándo puede iniciar la siguiente cita.
        </p>
        {!showAdd && (
          <button onClick={() => { setShowAdd(true); setEditingId(null); setForm(EMPTY_FORM); }}
            className="ml-4 flex items-center gap-2 shrink-0 text-[10px] tracking-[0.2em] uppercase border border-[#81807F]/40 text-[#81807F] px-4 py-2.5 hover:bg-[#81807F]/5 transition-colors">
            <Plus size={12} /> Agregar
          </button>
        )}
      </div>

      {showAdd && (
        <div className="mb-6">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#555] mb-2">Nuevo servicio</p>
          <ServiceForm form={form} setForm={setForm} onSave={handleSave} onCancel={cancel} saving={saving} />
        </div>
      )}

      {svcError && (
        <p className="text-red-400 text-xs mb-4">{svcError}</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-4 h-4 border border-[#81807F] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div>
          {services.map((svc, i) => {
            const gap = Math.max(0, svc.duration_minutes - svc.active_minutes);
            const isEditing = editingId === svc.id;
            const activePct = Math.min(100, (svc.active_minutes / svc.duration_minutes) * 100);
            return (
              <div key={svc.id} className={`${i === 0 ? 'border-t border-black/5' : ''}`}>
                <div className="border-b border-black/5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-3 flex-wrap mb-1">
                        <span className="font-[family-name:var(--font-display)] text-[#1C1A19] text-base">{svc.name}</span>
                        <span className="text-[#81807F] text-sm font-light">{svc.price != null ? `$${svc.price.toLocaleString('es-MX')}` : 'Por cotización'}</span>
                        <span className="text-[#B0AAA5] text-xs">anticipo ${svc.deposit_amount}</span>
                      </div>
                      {svc.description && <p className="text-[#6B6560] text-xs mb-2">{svc.description}</p>}
                      {/* Time bar */}
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex h-1 w-20 overflow-hidden flex-shrink-0">
                          <div style={{ width: `${activePct}%`, background: '#81807F55' }} />
                          {gap > 0 && <div style={{ width: `${100 - activePct}%`, background: '#D8D4CF' }} />}
                        </div>
                        <span className="text-[10px] text-[#6B6560]">
                          {formatDuration(svc.duration_minutes)} total
                          {gap > 0 && (
                            <span className="text-[#B0AAA5]"> · {formatDuration(svc.active_minutes)} contigo · {formatDuration(gap)} procesando</span>
                          )}
                        </span>
                      </div>
                      {gap > 0 && (
                        <p className="text-[9px] tracking-[0.05em] uppercase" style={{ color: '#C0BBB6' }}>
                          Siguiente cita posible {formatDuration(svc.active_minutes)} después del inicio
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button onClick={() => isEditing ? cancel() : startEdit(svc)}
                        className="p-2 text-[#9A9590] hover:text-[#81807F] transition-colors">
                        <Pencil size={13} />
                      </button>
                      {confirmDeleteId === svc.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(svc.id)} disabled={deleting === svc.id}
                            className="text-[9px] tracking-wider uppercase border border-red-300 text-red-500 px-2 py-1 hover:bg-red-50 transition-colors">
                            ¿Segura?
                          </button>
                          <button onClick={() => setConfirmDeleteId(null)}
                            className="text-[9px] tracking-wider uppercase border border-black/8 text-[#9A9590] px-2 py-1 hover:text-[#1C1A19] transition-colors">
                            No
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => handleDelete(svc.id)} disabled={deleting === svc.id}
                          className="p-2 text-[#C0BBB6] hover:text-red-500 transition-colors disabled:opacity-40">
                          {deleting === svc.id ? <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {isEditing && <ServiceForm form={form} setForm={setForm} onSave={handleSave} onCancel={cancel} saving={saving} id={svc.id} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Trusted clients tab ───────────────────────────────────────────
interface TrustedClient { id: string; name: string; phone: string; notes: string | null; email: string | null; }
interface ClientRecord {
  name: string;
  phone: string;
  phone_normalized: string;
  email: string | null;
  appt_count: number;
  last_appt: string | null;
}
type ClientFilter = 'todos' | 'nuevos' | 'frecuentes';

function ClientesTab({ adminSecret }: { adminSecret: string }) {
  const [filter, setFilter]             = useState<ClientFilter>('todos');
  const [clientSearch, setClientSearch] = useState('');
  const [trustedClients, setTrustedClients] = useState<TrustedClient[]>([]);
  const [allClients, setAllClients]     = useState<ClientRecord[]>([]);
  const [loading, setLoading]           = useState(false);
  const [promoting, setPromoting]       = useState<string | null>(null);
  const [deleting, setDeleting]         = useState<string | null>(null);
  const [deletingPhone, setDeletingPhone] = useState<string | null>(null);
  // edit trusted client
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editName, setEditName]         = useState('');
  const [editPhone, setEditPhone]       = useState('');
  const [editEmail, setEditEmail]       = useState('');
  const [editNotes, setEditNotes]       = useState('');
  const [editSaving, setEditSaving]     = useState(false);
  // add form
  const [showForm, setShowForm]         = useState(false);
  const [formSaving, setFormSaving]     = useState(false);
  const [name, setName]                 = useState('');
  const [countryCode, setCountryCode]   = useState('+52');
  const [phone, setPhone]               = useState('');
  const [email, setEmail]               = useState('');
  const [notes, setNotes]               = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [apptRes, trustedRes] = await Promise.all([
        fetch('/api/appointments', { headers: { 'x-admin-secret': adminSecret } }),
        fetch('/api/trusted-clients', { headers: { 'x-admin-secret': adminSecret } }),
      ]);
      const apptData    = await apptRes.json();
      const trustedData = await trustedRes.json();
      setTrustedClients(trustedData.clients ?? []);

      const appts: Appointment[] = [...(apptData.appointments ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
      const seen = new Map<string, ClientRecord>();
      for (const a of appts) {
        const norm = a.client_phone.replace(/\D/g, '').slice(-10);
        if (!seen.has(norm)) {
          seen.set(norm, { name: a.client_name, phone: a.client_phone, phone_normalized: norm, email: a.client_email, appt_count: 0, last_appt: a.appointment_date });
        }
        seen.get(norm)!.appt_count++;
      }
      setAllClients([...seen.values()].sort((a, b) => a.name.localeCompare(b.name)));
    } catch { /* */ }
    finally { setLoading(false); }
  }, [adminSecret]);

  useEffect(() => { load(); }, [load]);

  const promote = async (client: ClientRecord) => {
    setPromoting(client.phone_normalized);
    try {
      const res = await fetch('/api/trusted-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
        body: JSON.stringify({ name: client.name, phone: client.phone, notes: null }),
      });
      if (res.ok) {
        const tc = await res.json();
        setTrustedClients(prev => [...prev, tc]);
      } else {
        const err = await res.json().catch(() => ({}));
        const msg = (err as { error?: string }).error ?? 'Error desconocido';
        alert(`No se pudo agregar: ${msg}`);
      }
    } catch {
      alert('Error de conexión. Intenta de nuevo.');
    } finally {
      setPromoting(null);
    }
  };

  const demote = async (id: string) => {
    setDeleting(id);
    try {
      await fetch('/api/trusted-clients', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
        body: JSON.stringify({ id }),
      });
      setTrustedClients(prev => prev.filter(c => c.id !== id));
    } finally { setDeleting(null); }
  };

  const handleAdd = async () => {
    if (!name.trim() || phone.length !== 10) return;
    setFormSaving(true);
    try {
      const res = await fetch('/api/trusted-clients', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
        body: JSON.stringify({ name: name.trim(), phone: `${countryCode.trim()} ${phone.trim()}`, email: email.trim() || null, notes: notes.trim() || null }),
      });
      if (res.ok) {
        const tc = await res.json();
        setTrustedClients(prev => [...prev, tc].sort((a, b) => a.name.localeCompare(b.name)));
        setName(''); setPhone(''); setEmail(''); setNotes(''); setCountryCode('+52'); setShowForm(false);
      }
    } finally { setFormSaving(false); }
  };

  const startEdit = (tc: TrustedClient) => {
    setEditingId(tc.id);
    setEditName(tc.name);
    setEditPhone(tc.phone);
    setEditEmail(tc.email ?? '');
    setEditNotes(tc.notes ?? '');
  };

  const handleEdit = async () => {
    if (!editingId || !editName.trim() || !editPhone.trim()) return;
    setEditSaving(true);
    try {
      const res = await fetch('/api/trusted-clients', {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
        body: JSON.stringify({ id: editingId, name: editName.trim(), phone: editPhone.trim(), email: editEmail.trim() || null, notes: editNotes.trim() || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTrustedClients(prev => prev.map(c => c.id === editingId ? updated : c).sort((a, b) => a.name.localeCompare(b.name)));
        setEditingId(null);
      }
    } finally { setEditSaving(false); }
  };

  const handleDeleteByPhone = async (phoneNorm: string, displayName: string) => {
    if (!confirm(`¿Eliminar todos los registros de ${displayName}? Esta acción no se puede deshacer.`)) return;
    setDeletingPhone(phoneNorm);
    try {
      await fetch('/api/appointments', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
        body: JSON.stringify({ phone: phoneNorm }),
      });
      setAllClients(prev => prev.filter(c => c.phone_normalized !== phoneNorm));
    } finally { setDeletingPhone(null); }
  };

  const displayed = useMemo(() => {
    const trustedNorms = new Map(trustedClients.map(tc => [tc.phone.replace(/\D/g, '').slice(-10), tc]));
    const q = clientSearch.trim().toLowerCase();
    const applySearch = <T extends { name: string; phone: string }>(list: T[]) =>
      q ? list.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q)) : list;
    if (filter === 'frecuentes') {
      const list = trustedClients.map(tc => {
        const norm = tc.phone.replace(/\D/g, '').slice(-10);
        const fromAppts = allClients.find(c => c.phone_normalized === norm);
        return { name: tc.name, phone: tc.phone, phone_normalized: norm, email: tc.email, appt_count: fromAppts?.appt_count ?? 0, last_appt: fromAppts?.last_appt ?? null, trusted_id: tc.id, notes: tc.notes };
      }).sort((a, b) => a.name.localeCompare(b.name));
      return applySearch(list);
    }
    if (filter === 'nuevos') {
      const list = allClients.filter(c => !trustedNorms.has(c.phone_normalized)).map(c => ({ ...c, trusted_id: null as string | null, notes: null as string | null }));
      return applySearch(list);
    }
    // todos
    const result: (ClientRecord & { trusted_id: string | null; notes: string | null })[] = allClients.map(c => ({
      ...c, trusted_id: trustedNorms.get(c.phone_normalized)?.id ?? null, notes: null,
    }));
    for (const tc of trustedClients) {
      const norm = tc.phone.replace(/\D/g, '').slice(-10);
      if (!allClients.find(c => c.phone_normalized === norm)) {
        result.push({ name: tc.name, phone: tc.phone, phone_normalized: norm, email: tc.email, appt_count: 0, last_appt: null, trusted_id: tc.id, notes: tc.notes });
      }
    }
    return applySearch(result.sort((a, b) => a.name.localeCompare(b.name)));
  }, [filter, clientSearch, allClients, trustedClients]);

  const counts = useMemo(() => {
    const trustedNorms = new Set(trustedClients.map(tc => tc.phone.replace(/\D/g, '').slice(-10)));
    const notInAppts = trustedClients.filter(tc => !allClients.find(c => c.phone_normalized === tc.phone.replace(/\D/g, '').slice(-10))).length;
    return {
      todos: allClients.length + notInAppts,
      nuevos: allClients.filter(c => !trustedNorms.has(c.phone_normalized)).length,
      frecuentes: trustedClients.length,
    };
  }, [allClients, trustedClients]);

  return (
    <div className="space-y-6">
      {/* Filter + actions */}
      <div className="flex items-center gap-0 border-b border-black/8 flex-wrap">
        {(['todos', 'nuevos', 'frecuentes'] as ClientFilter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-3 text-[9px] tracking-[0.18em] uppercase border-b-2 transition-colors capitalize ${
              filter === f ? 'border-[#1C1A19] text-[#1C1A19]' : 'border-transparent text-[#9A9590] hover:text-[#6B6560]'
            }`}>
            {f} <span className="ml-1 opacity-50">({counts[f]})</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 pb-1">
          <button onClick={load} disabled={loading} className="text-[#9A9590] hover:text-[#81807F] transition-colors p-1">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 text-[9px] tracking-[0.15em] uppercase border border-[#81807F]/30 text-[#81807F] px-3 py-1.5 hover:bg-[#81807F]/10 transition-colors">
            <UserPlus size={11} /> Agregar
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        type="text" value={clientSearch}
        onChange={e => setClientSearch(e.target.value)}
        placeholder="Buscar por nombre o teléfono..."
        className="w-full bg-transparent border border-black/8 text-[#1C1A19] px-3 py-2 text-sm focus:outline-none focus:border-[#81807F]/40 placeholder:text-black/25"
        style={{ fontSize: '16px' }}
      />

      {/* Add form */}
      {showForm && (
        <div className="border border-black/10 p-4">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#6B6560] mb-4">Nueva clienta frecuente</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase text-[#6B6560] mb-2">Nombre</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre completo"
                className="w-full bg-transparent border border-black/10 text-[#1C1A19] px-3 py-2.5 focus:outline-none focus:border-[#81807F]/60 placeholder:text-black/25" style={{ fontSize: '16px' }} />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase text-[#6B6560] mb-2">WhatsApp — 10 dígitos</label>
              <div className="flex border border-black/10 focus-within:border-[#81807F]/60 transition-colors">
                <input type="text" value={countryCode} onChange={e => setCountryCode(e.target.value)}
                  className="w-14 bg-transparent text-[#9A9590] px-2 py-2.5 text-center focus:outline-none border-r border-black/10 shrink-0" style={{ fontSize: '16px' }} />
                <input type="tel" inputMode="numeric" value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="669 123 4567"
                  className="flex-1 bg-transparent text-[#1C1A19] px-3 py-2.5 focus:outline-none placeholder:text-black/25" style={{ fontSize: '16px' }} />
                {phone.length > 0 && (
                  <span className={`flex items-center pr-3 text-[10px] shrink-0 ${phone.length === 10 ? 'text-emerald-600' : 'text-[#9A9590]'}`}>{phone.length}/10</span>
                )}
              </div>
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase text-[#6B6560] mb-2">Correo (opcional)</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="cliente@correo.com"
                className="w-full bg-transparent border border-black/10 text-[#1C1A19] px-3 py-2.5 focus:outline-none focus:border-[#81807F]/60 placeholder:text-black/25" style={{ fontSize: '16px' }} />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase text-[#6B6560] mb-2">Notas (opcional)</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Prefiere tinte oscuro..."
                className="w-full bg-transparent border border-black/10 text-[#1C1A19] px-3 py-2.5 focus:outline-none focus:border-[#81807F]/60 placeholder:text-black/25" style={{ fontSize: '16px' }} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={formSaving || !name.trim() || phone.length !== 10}
              className="flex items-center gap-2 bg-[#F0EDE8] text-[#16181E] px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase font-semibold hover:bg-[#E0DBD4] transition-colors disabled:opacity-30">
              {formSaving ? <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <UserPlus size={12} />}
              Guardar
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2.5 text-[10px] tracking-[0.15em] uppercase text-[#9A9590] border border-black/8 hover:border-black/20 transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-4 h-4 border border-[#81807F] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="border border-black/5 py-14 text-center">
          <p className="text-[#9A9590] text-sm">
            {clientSearch.trim() ? 'Sin resultados.' : filter === 'frecuentes' ? 'No hay clientas frecuentes registradas.'
              : filter === 'nuevos' ? 'Todas las clientas ya son frecuentes.'
              : 'No hay clientas registradas.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-black/5">
          {displayed.map(c => (
            <div key={c.phone_normalized}>
              <div className="flex items-center justify-between py-3.5 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {c.trusted_id
                    ? <Star size={11} className="text-[#81807F] shrink-0" />
                    : <span className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" />
                  }
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[#1C1A19] text-sm">{c.name}</p>
                      {c.appt_count > 0 && (
                        <span className="text-[9px] tracking-wider text-[#B0AAA5]">{c.appt_count} visita{c.appt_count !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                    <p className="text-[#6B6560] text-xs mt-0.5 truncate">{c.phone}{c.email ? <span className="text-[#B0AAA5]"> · {c.email}</span> : null}</p>
                    {c.notes && <p className="text-[#B0AAA5] text-[10px] mt-0.5 italic">{c.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {c.trusted_id && (
                    <button onClick={() => editingId === c.trusted_id ? setEditingId(null) : startEdit(trustedClients.find(t => t.id === c.trusted_id)!)}
                      className="text-[#B0AAA5] hover:text-[#81807F] transition-colors p-1.5">
                      <Pencil size={12} />
                    </button>
                  )}
                  {!c.trusted_id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => promote(c)} disabled={promoting === c.phone_normalized}
                        className="flex items-center gap-1 text-[9px] tracking-[0.1em] uppercase border border-[#81807F]/25 text-[#81807F]/60 px-2.5 py-1.5 hover:bg-[#81807F]/10 hover:text-[#81807F] transition-colors disabled:opacity-40">
                        {promoting === c.phone_normalized ? <div className="w-3 h-3 border border-[#81807F] border-t-transparent rounded-full animate-spin" /> : <Star size={9} />}
                        Frecuente
                      </button>
                      <button onClick={() => handleDeleteByPhone(c.phone_normalized, c.name)} disabled={deletingPhone === c.phone_normalized}
                        className="text-[#B0AAA5] hover:text-red-500 transition-colors disabled:opacity-40 p-1.5">
                        {deletingPhone === c.phone_normalized ? <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" /> : <Trash2 size={12} />}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => demote(c.trusted_id!)} disabled={deleting === c.trusted_id}
                      className="text-[#B0AAA5] hover:text-red-500 transition-colors disabled:opacity-40 p-1.5">
                      {deleting === c.trusted_id ? <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  )}
                </div>
              </div>
              {/* Inline edit form for trusted client */}
              {editingId === c.trusted_id && (
                <div className="border border-black/10 p-4 mb-2" style={{ background: '#F3F1EE' }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-[10px] tracking-[0.15em] uppercase text-[#6B6560] mb-1.5">Nombre</label>
                      <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                        className="w-full bg-transparent border border-black/10 text-[#1C1A19] px-3 py-2 focus:outline-none focus:border-[#81807F]/50 placeholder:text-black/25" style={{ fontSize: '16px' }} />
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-[0.15em] uppercase text-[#6B6560] mb-1.5">Teléfono</label>
                      <input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)}
                        className="w-full bg-transparent border border-black/10 text-[#1C1A19] px-3 py-2 focus:outline-none focus:border-[#81807F]/50 placeholder:text-black/25" style={{ fontSize: '16px' }} />
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-[0.15em] uppercase text-[#6B6560] mb-1.5">Correo (opcional)</label>
                      <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                        className="w-full bg-transparent border border-black/10 text-[#1C1A19] px-3 py-2 focus:outline-none focus:border-[#81807F]/50 placeholder:text-black/25" style={{ fontSize: '16px' }} />
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-[0.15em] uppercase text-[#6B6560] mb-1.5">Notas (opcional)</label>
                      <input type="text" value={editNotes} onChange={e => setEditNotes(e.target.value)}
                        className="w-full bg-transparent border border-black/10 text-[#1C1A19] px-3 py-2 focus:outline-none focus:border-[#81807F]/50 placeholder:text-black/25" style={{ fontSize: '16px' }} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleEdit} disabled={editSaving || !editName.trim() || !editPhone.trim()}
                      className="flex items-center gap-2 bg-[#F0EDE8] text-[#16181E] px-4 py-2 text-[10px] tracking-[0.2em] uppercase font-semibold hover:bg-[#E0DBD4] transition-colors disabled:opacity-30">
                      {editSaving ? <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Check size={11} />}
                      Guardar
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="px-3 py-2 text-[10px] tracking-[0.15em] uppercase text-[#9A9590] border border-black/8 hover:border-black/20 transition-colors">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Config tab ────────────────────────────────────────────────────
const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAYS_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon–Sun display order

interface ScheduleDay { day_of_week: number; is_active: boolean; start_time: string; end_time: string; break_start?: string | null; break_end?: string | null; }
interface AppSettings { [key: string]: string; }

const DEFAULT_SETTINGS: AppSettings = {
  salon_name:       'Daniela Palacio Hair Room',
  city:             'Mazatlán, Sin.',
  whatsapp:         '526699445566',
  instagram:        'danielapalaciosalon',
  description:      'Estudio especializado en color, cortes y tratamientos.',
  advance_days:     '60',
  min_notice_hours: '2',
  msg_confirmation: 'Hola {nombre} 👋 Tu cita para *{servicio}* está confirmada para el *{fecha}* a las *{hora}* 💛 Si necesitas cancelar o reagendar, escríbeme con al menos 24h de anticipación.',
  msg_reminder_24h: 'Hola {nombre} 👋✨\n\nTe recuerdo que mañana tienes cita en *Daniela Palacio Hair Room*:\n\n📅 {fecha}\n⏰ {hora} hrs\n✂️ *{servicio}*\n\nPor favor confírmame tu asistencia respondiendo *SÍ ✅* o en caso de no poder asistir avísame con anticipación.\n\n¡Te esperamos! 🌟\n— Daniela Palacio Hair Room',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 text-[9px] tracking-[0.12em] uppercase border border-black/10 text-[#6B6560] px-2.5 py-1.5 hover:border-[#81807F]/40 hover:text-[#81807F] transition-colors"
    >
      {copied ? <CheckIcon size={10} className="text-emerald-400" /> : <Copy size={10} />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-black/5 pb-4 mb-5">
      <p className="text-[10px] tracking-[0.3em] uppercase text-[#6B6560]">{title}</p>
      {subtitle && <p className="text-[#B0AAA5] text-xs mt-1">{subtitle}</p>}
    </div>
  );
}

function ConfigTab({ adminSecret }: { adminSecret: string }) {
  const [settings, setSettings]   = useState<AppSettings>(DEFAULT_SETTINGS);
  const [schedule, setSchedule]   = useState<ScheduleDay[]>([]);
  const [loading, setLoading]     = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  // local editable copies per section
  const [identity, setIdentity]   = useState<AppSettings>({});
  const [booking, setBooking]     = useState<AppSettings>({});
  const [messages, setMessages]   = useState<AppSettings>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, schRes] = await Promise.all([fetch('/api/settings', { headers: { 'x-admin-secret': adminSecret } }), fetch('/api/schedule', { headers: { 'x-admin-secret': adminSecret } })]);
      const sData   = await sRes.json();
      const schData = await schRes.json();
      const merged = { ...DEFAULT_SETTINGS, ...sData.settings };
      setSettings(merged);
      setIdentity({ salon_name: merged.salon_name, city: merged.city, whatsapp: merged.whatsapp, instagram: merged.instagram, description: merged.description });
      setBooking({ advance_days: merged.advance_days, min_notice_hours: merged.min_notice_hours });
      setMessages({ msg_confirmation: merged.msg_confirmation, msg_reminder_24h: merged.msg_reminder_24h });
      setSchedule(schData.schedule ?? []);
    } finally { setLoading(false); }
  }, [adminSecret]);

  useEffect(() => { load(); }, [load]);

  const saveSection = async (section: string, data: AppSettings) => {
    setSavingSection(section);
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
        body: JSON.stringify(data),
      });
      setSettings(prev => ({ ...prev, ...data }));
    } finally { setSavingSection(null); }
  };

  const updateDay = async (dow: number, patch: Partial<ScheduleDay>) => {
    const current = schedule.find(d => d.day_of_week === dow) ?? { day_of_week: dow, is_active: false, start_time: '10:00', end_time: '19:00' };
    const updated = { ...current, ...patch };
    setSchedule(prev => prev.some(d => d.day_of_week === dow) ? prev.map(d => d.day_of_week === dow ? updated : d) : [...prev, updated]);
    await fetch('/api/schedule', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
      body: JSON.stringify(updated),
    });
  };

  const inputCls = "w-full bg-transparent border border-black/10 text-[#1C1A19] px-3 py-2.5 focus:outline-none focus:border-[#81807F]/50 placeholder:text-black/25 text-sm";
  const SaveBtn = ({ section }: { section: string }) => (
    <button
      onClick={() => {
        if (section === 'identity') saveSection('identity', identity);
        if (section === 'booking')  saveSection('booking',  booking);
        if (section === 'messages') saveSection('messages', messages);
      }}
      disabled={savingSection === section}
      className="flex items-center gap-2 bg-[#F0EDE8] text-[#16181E] px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase font-semibold hover:bg-[#E0DBD4] transition-colors disabled:opacity-40"
    >
      {savingSection === section ? <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Check size={12} />}
      {savingSection === section ? 'Guardando…' : 'Guardar'}
    </button>
  );

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-4 h-4 border border-[#81807F] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-12">

      {/* ── Identidad ── */}
      <section>
        <SectionHeader title="Identidad del negocio" subtitle="Nombre, ciudad y redes que aparecen en el sitio" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {[
            { key: 'salon_name',  label: 'Nombre del salón',     placeholder: 'Daniela Palacio Hair Room' },
            { key: 'city',        label: 'Ciudad',               placeholder: 'Mazatlán, Sin.' },
            { key: 'whatsapp',    label: 'WhatsApp (con código)', placeholder: '526699445566' },
            { key: 'instagram',   label: 'Instagram (sin @)',     placeholder: 'danielapalaciosalon' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-[10px] tracking-[0.15em] uppercase text-[#6B6560] mb-1.5">{label}</label>
              <input
                type="text" value={identity[key] ?? ''} placeholder={placeholder}
                onChange={e => setIdentity(p => ({ ...p, [key]: e.target.value }))}
                className={inputCls} style={{ fontSize: '16px' }}
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className="block text-[10px] tracking-[0.15em] uppercase text-[#6B6560] mb-1.5">Descripción corta</label>
            <input
              type="text" value={identity.description ?? ''} placeholder="Breve texto que aparece bajo el nombre"
              onChange={e => setIdentity(p => ({ ...p, description: e.target.value }))}
              className={inputCls} style={{ fontSize: '16px' }}
            />
          </div>
        </div>
        <SaveBtn section="identity" />
      </section>

      {/* ── Horario ── */}
      <section>
        <SectionHeader title="Horario de trabajo" subtitle="Activa los días y define la apertura y cierre" />
        <div className="space-y-1">
          {DAYS_ORDER.map(dow => {
            const day = schedule.find(d => d.day_of_week === dow) ?? { day_of_week: dow, is_active: false, start_time: '10:00', end_time: '19:00', break_start: null, break_end: null };
            const hasBreak = !!(day.break_start && day.break_end);
            return (
              <div key={dow} className={`py-3 border-b border-black/5 ${!day.is_active ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => updateDay(dow, { is_active: !day.is_active })}
                    className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${day.is_active ? 'bg-[#81807F]' : 'bg-black/10'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${day.is_active ? 'left-4' : 'left-0.5'}`} />
                  </button>
                  <span className="text-sm w-20 shrink-0 text-[#1C1A19]">{DAYS_ES[dow]}</span>
                  {day.is_active ? (
                    <div className="flex items-center gap-1 flex-1 min-w-0 flex-wrap">
                      <input type="time" value={day.start_time}
                        onChange={e => updateDay(dow, { start_time: e.target.value })}
                        className="bg-transparent border border-black/10 text-[#1C1A19] px-2 py-1.5 text-sm focus:outline-none focus:border-[#81807F]/50 flex-1 min-w-[96px]"
                        style={{ fontSize: '16px' }}
                      />
                      <span className="text-[#9A9590] text-xs">—</span>
                      <input type="time" value={day.end_time}
                        onChange={e => updateDay(dow, { end_time: e.target.value })}
                        className="bg-transparent border border-black/10 text-[#1C1A19] px-2 py-1.5 text-sm focus:outline-none focus:border-[#81807F]/50 flex-1 min-w-[96px]"
                        style={{ fontSize: '16px' }}
                      />
                      <button
                        onClick={() => updateDay(dow, hasBreak ? { break_start: null, break_end: null } : { break_start: '14:00', break_end: '16:00' })}
                        className={`text-[9px] tracking-[0.12em] uppercase px-2 py-1.5 border transition-colors shrink-0 ${hasBreak ? 'border-[#81807F]/40 text-[#81807F]' : 'border-black/10 text-[#9A9590] hover:border-black/25 hover:text-[#6B6560]'}`}
                      >
                        {hasBreak ? 'Descanso ✓' : '+ Descanso'}
                      </button>
                    </div>
                  ) : (
                    <span className="text-[#B0AAA5] text-xs">Cerrado</span>
                  )}
                </div>
                {day.is_active && hasBreak && (
                  <div className="flex items-center gap-1 mt-2 ml-[116px] flex-wrap">
                    <span className="text-[#6B6560] text-[10px] tracking-[0.1em] uppercase shrink-0">Cerrado</span>
                    <input type="time" value={day.break_start ?? '14:00'}
                      onChange={e => updateDay(dow, { break_start: e.target.value })}
                      className="bg-transparent border border-black/10 text-[#9A9590] px-2 py-1 text-sm focus:outline-none focus:border-[#81807F]/50 flex-1 min-w-[96px]"
                      style={{ fontSize: '16px' }}
                    />
                    <span className="text-[#9A9590] text-xs">—</span>
                    <input type="time" value={day.break_end ?? '16:00'}
                      onChange={e => updateDay(dow, { break_end: e.target.value })}
                      className="bg-transparent border border-black/10 text-[#9A9590] px-2 py-1 text-sm focus:outline-none focus:border-[#81807F]/50 flex-1 min-w-[96px]"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[#B0AAA5] text-xs mt-3">Los cambios de horario se guardan al instante.</p>
      </section>

      {/* ── Reservaciones ── */}
      <section>
        <SectionHeader title="Ventana de reservaciones" subtitle="Controla cuándo pueden reservar las clientas" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-[10px] tracking-[0.15em] uppercase text-[#6B6560] mb-1.5">Días de anticipación máxima</label>
            <input type="number" min="7" max="365" value={booking.advance_days ?? '60'}
              onChange={e => setBooking(p => ({ ...p, advance_days: e.target.value }))}
              className={inputCls} style={{ fontSize: '16px' }} />
            <p className="text-[#B0AAA5] text-[10px] mt-1">Las clientas podrán ver hasta este número de días adelante</p>
          </div>
          <div>
            <label className="block text-[10px] tracking-[0.15em] uppercase text-[#6B6560] mb-1.5">Aviso mínimo (horas)</label>
            <input type="number" min="0" max="72" value={booking.min_notice_hours ?? '2'}
              onChange={e => setBooking(p => ({ ...p, min_notice_hours: e.target.value }))}
              className={inputCls} style={{ fontSize: '16px' }} />
            <p className="text-[#B0AAA5] text-[10px] mt-1">No se puede reservar con menos de X horas de anticipación</p>
          </div>
        </div>
        <SaveBtn section="booking" />
      </section>

      {/* ── Servicios ── */}
      <section>
        <SectionHeader title="Servicios" subtitle="Crea, edita o desactiva los servicios disponibles" />
        <ServicesTab adminSecret={adminSecret} />
      </section>

      {/* ── Mensajes WhatsApp ── */}
      <section>
        <SectionHeader title="Mensajes de WhatsApp" subtitle="Plantillas con variables: {nombre} {servicio} {fecha} {hora}" />
        <div className="space-y-5 mb-4">
          {[
            { key: 'msg_confirmation', label: 'Confirmación de reserva', hint: 'Se envía después de que una clienta completa su reserva' },
            { key: 'msg_reminder_24h', label: 'Mensaje recordatorio 24h antes', hint: 'Usa los placeholders: {nombre} {servicio} {fecha} {hora}' },
          ].map(({ key, label, hint }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] tracking-[0.15em] uppercase text-[#6B6560]">{label}</label>
                <CopyButton text={messages[key] ?? ''} />
              </div>
              <textarea
                rows={key === 'msg_reminder_24h' ? 6 : 4} value={messages[key] ?? ''}
                onChange={e => setMessages(p => ({ ...p, [key]: e.target.value }))}
                className="w-full bg-transparent border border-black/10 text-[#1C1A19] px-3 py-2.5 focus:outline-none focus:border-[#81807F]/50 placeholder:text-black/25 text-sm resize-none"
                style={{ fontSize: '16px' }}
              />
              <p className="text-[#B0AAA5] text-[10px] mt-1">{hint}</p>
            </div>
          ))}
        </div>
        <div className="p-3 border border-black/5 mb-4" style={{ background: '#F3F1EE' }}>
          <p className="text-[10px] tracking-[0.15em] uppercase text-[#9A9590] mb-2">Variables disponibles</p>
          <div className="flex flex-wrap gap-2">
            {['{nombre}', '{servicio}', '{fecha}', '{hora}'].map(v => (
              <span key={v} className="text-[11px] font-mono px-2 py-0.5 border border-black/10 text-[#81807F]">{v}</span>
            ))}
          </div>
        </div>
        <SaveBtn section="messages" />
      </section>

    </div>
  );
}

// ── Push helpers ──────────────────────────────────────────────────
function urlBase64ToUint8Array(b64: string): Uint8Array {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4);
  const base64  = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function registerPush(secret: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  if (Notification.permission === 'denied') return false;
  const reg  = await navigator.serviceWorker.register('/sw.js');
  const perm = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();
  if (perm !== 'granted') return false;
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return false;
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as Uint8Array<ArrayBuffer> });
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
    body: JSON.stringify(sub),
  });
  return true;
}

// ── Main ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const [authed, setAuthed]           = useState(false);
  const [adminSecret, setAdminSecret] = useState('');
  const [tab, setTab]                 = useState<Tab>('inicio');
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('dp_admin_secret');
    if (saved) { setAuthed(true); setAdminSecret(saved); }
  }, []);

  useEffect(() => {
    if (!authed || !adminSecret) return;
    // Check if already subscribed
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js').then((reg) =>
        reg.pushManager.getSubscription().then((sub) => { if (sub) setPushEnabled(true); })
      ).catch(() => {});
    }
  }, [authed, adminSecret]);

  if (!authed) return <AuthScreen onAuth={(pass) => {
    sessionStorage.setItem('dp_admin_secret', pass);
    setAuthed(true); setAdminSecret(pass);
  }} />;

  return (
    <div className="min-h-screen font-[family-name:var(--font-body)]" style={{ background: '#F7F5F2' }}>
      <div className="border-b border-black/8 px-5 py-4 flex items-center justify-between" style={{ background: '#FFFFFF' }}>
        <Link href="/" className="flex items-center gap-2 text-[#9A9590] hover:text-[#81807F] transition-colors">
          <ArrowLeft size={15} />
          <span className="hidden sm:inline text-xs tracking-wider uppercase">Sitio</span>
        </Link>
        <span className="font-[family-name:var(--font-display)] text-xs tracking-[0.3em] uppercase text-[#81807F]">Admin</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => registerPush(adminSecret).then(setPushEnabled).catch(() => {})}
            title={pushEnabled ? 'Notificaciones activas' : 'Activar notificaciones'}
            className={`transition-colors p-1 ${pushEnabled ? 'text-[#81807F]' : 'text-[#C0BBB6] hover:text-[#81807F]'}`}
          >
            <Bell size={15} />
          </button>
          <button
            onClick={() => { sessionStorage.removeItem('dp_admin_secret'); setAuthed(false); setAdminSecret(''); }}
            className="text-[#9A9590] hover:text-red-600 transition-colors text-[9px] tracking-[0.15em] uppercase border border-black/10 px-2.5 py-1.5 hover:border-red-300"
          >
            Salir
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-6 pb-24">
        {tab === 'inicio'   && <InicioTab adminSecret={adminSecret} />}
        {tab === 'agenda'   && <AgendaTab adminSecret={adminSecret} />}
        {tab === 'clientes' && <ClientesTab adminSecret={adminSecret} />}
        {tab === 'config'   && <ConfigTab adminSecret={adminSecret} />}
      </div>

      {/* ── Bottom navigation ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-black/8" style={{ background: '#FFFFFF' }}>
        {([
          { key: 'inicio',   label: 'Inicio',   icon: <LayoutDashboard size={20} /> },
          { key: 'agenda',   label: 'Agenda',   icon: <Calendar size={20} /> },
          { key: 'clientes', label: 'Clientes', icon: <Users size={20} /> },
          { key: 'config',   label: 'Config',   icon: <Settings size={20} /> },
        ] as { key: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
              tab === t.key ? 'text-[#1C1A19]' : 'text-[#C0BBB6] hover:text-[#9A9590]'
            }`}>
            {t.icon}
            <span className="text-[8px] tracking-[0.12em] uppercase">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
