'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  format, parseISO, isToday, isTomorrow,
  startOfToday, addDays, getDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { DayPicker } from 'react-day-picker';
import {
  ArrowLeft, Check, X, Scissors, Phone, RefreshCw,
  Lock, Trash2, CalendarOff, Star, UserPlus, Calendar,
} from 'lucide-react';
import { Appointment, BlockedSlot } from '@/lib/types';
import { formatTime, timeToMinutes, minutesToTime } from '@/lib/slots';
import { MOCK_SCHEDULE } from '@/lib/mock-data';
import 'react-day-picker/dist/style.css';

const ADMIN_PASS = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? 'daniela2025';
type Tab = 'agenda' | 'frecuentes';

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
  return '#C9A84C';
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'confirmed')
    return <span className="text-[9px] tracking-[0.12em] uppercase text-emerald-400 border border-emerald-800 px-1.5 py-0.5">Confirmada</span>;
  if (status === 'cancelled')
    return <span className="text-[9px] tracking-[0.12em] uppercase text-white/25 border border-white/10 px-1.5 py-0.5">Cancelada</span>;
  if (status === 'pending_payment')
    return <span className="text-[9px] tracking-[0.12em] uppercase text-orange-400 border border-orange-800 px-1.5 py-0.5">Sin pagar</span>;
  return <span className="text-[9px] tracking-[0.12em] uppercase text-[#C9A84C] border border-[#C9A84C]/40 px-1.5 py-0.5">Pendiente</span>;
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
function AuthScreen({ onAuth }: { onAuth: () => void }) {
  const [pass, setPass] = useState('');
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 font-[family-name:var(--font-body)]" style={{ background: '#000' }}>
      <div className="w-full max-w-xs">
        <p className="font-[family-name:var(--font-display)] text-3xl text-white text-center mb-1 font-light">Admin</p>
        <p className="text-[10px] tracking-[0.4em] uppercase text-[#555] text-center mb-10">Daniela Palacio Hair Room</p>
        <input
          type="password" value={pass}
          onChange={(e) => setPass(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && pass === ADMIN_PASS) onAuth(); }}
          placeholder="Contraseña"
          className="w-full bg-transparent border border-white/10 text-white px-4 py-3 focus:outline-none focus:border-[#C9A84C]/60 transition-colors placeholder:text-white/20 mb-3"
          style={{ fontSize: '16px' }}
        />
        <button
          onClick={() => { if (pass === ADMIN_PASS) onAuth(); else alert('Contraseña incorrecta'); }}
          className="w-full bg-[#C9A84C] text-black py-3.5 text-[11px] tracking-[0.25em] uppercase font-semibold hover:bg-[#dbb85e] transition-colors"
        >
          Entrar
        </button>
        <div className="text-center mt-6">
          <Link href="/" className="text-[#444] text-xs hover:text-[#666] transition-colors tracking-wider">← Volver al sitio</Link>
        </div>
      </div>
    </div>
  );
}

// ── Agenda (Calendar + Appointments combined) ─────────────────────
function AgendaTab() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blocks, setBlocks]             = useState<BlockedSlot[]>([]);
  const [loading, setLoading]           = useState(false);
  const [updating, setUpdating]         = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Block form
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [allDay, setAllDay]         = useState(true);
  const [blockStart, setBlockStart] = useState('10:00');
  const [blockEnd, setBlockEnd]     = useState('14:00');
  const [blockReason, setBlockReason] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [apptRes, blockRes] = await Promise.all([
        fetch('/api/appointments'),
        fetch('/api/blocked-slots'),
      ]);
      const apptData  = await apptRes.json();
      const blockData = await blockRes.json();
      setAppointments(apptData.appointments ?? []);
      setBlocks(blockData.blocks ?? []);
    } catch { /* keep */ }
    finally { setLoading(false); }
  }, []);

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
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
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
      <div className="grid grid-cols-3 gap-px border border-white/8 mb-6">
        {[
          { label: 'Sin pagar',   val: sinPagar,    color: '#fb923c' },
          { label: 'Confirmadas', val: confirmadas, color: '#4ade80' },
          { label: 'Pendientes',  val: pendientes,  color: '#C9A84C' },
        ].map((s) => (
          <div key={s.label} className="p-3 text-center" style={{ background: '#0A0A0A' }}>
            <div className="font-[family-name:var(--font-display)] text-2xl font-light mb-0.5" style={{ color: s.color }}>{s.val}</div>
            <div className="text-[9px] tracking-[0.2em] uppercase text-[#444]">{s.label}</div>
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
              { label: 'Bloq.',  color: '#555', strike: true },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: l.color, opacity: l.strike ? 0.4 : 1 }} />
                <span className="text-[9px] tracking-wider uppercase" style={{ color: l.strike ? '#444' : l.color }}>{l.label}</span>
              </div>
            ))}
            <button onClick={loadData} disabled={loading} className="ml-auto text-[#444] hover:text-[#C9A84C] transition-colors">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* DayPicker */}
          <div className="border border-white/8 overflow-x-auto">
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
                blocked:  { color: '#555', textDecoration: 'line-through' },
                selected: { backgroundColor: '#C9A84C', color: '#000', fontWeight: '700', borderRadius: '0' },
                today:    { color: '#C9A84C', fontWeight: '600' },
              }}
              styles={{
                day:           { color: '#F0EDE8', borderRadius: '0', minWidth: '38px', minHeight: '38px' },
                caption_label: { color: '#F0EDE8', fontFamily: 'var(--font-display)', letterSpacing: '0.05em', fontSize: '0.85rem' },
                weekday:       { color: '#444', textTransform: 'uppercase', fontSize: '0.55rem', letterSpacing: '0.15em' },
                root:          { background: 'transparent', padding: '12px' },
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
                <span className="text-[9px] uppercase tracking-wider text-[#444]">{s.label}</span>
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
                  <p className="font-[family-name:var(--font-display)] text-2xl font-light text-white capitalize">
                    {isToday(selectedDate) ? 'Hoy' : isTomorrow(selectedDate) ? 'Mañana'
                      : format(selectedDate, "EEEE", { locale: es })}
                  </p>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-[#555] capitalize">
                    {format(selectedDate, "d 'de' MMMM yyyy", { locale: es })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDate(undefined)}
                  className="text-[9px] tracking-[0.15em] uppercase text-[#444] hover:text-[#888] transition-colors border border-white/8 px-2 py-1"
                >
                  Ver todos
                </button>
              </div>

              {/* Full day timeline */}
              {timeline.length === 0 ? (
                <div className="border border-white/5 py-10 text-center mb-6">
                  <CalendarOff size={18} className="text-white/10 mx-auto mb-2" />
                  <p className="text-[#444] text-sm">Día no laborable</p>
                </div>
              ) : (
                <div className="mb-6 border border-white/5">
                  {timeline.map((row, i) => {
                    const color = row.appt ? serviceColor(row.appt.dp_services?.name) : null;

                    /* ── Appointment start ── */
                    if (row.appt && row.apptIsStart) {
                      const apt = row.appt;
                      return (
                        <div
                          key={i}
                          className="border-b border-white/5 py-3"
                          style={{ borderLeft: `3px solid ${color}`, paddingLeft: '12px' }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[#C9A84C] text-xs font-medium">{formatTime(row.time)}</span>
                            <span className="text-[#444] text-xs">→ {formatTime(apt.end_time)}</span>
                            <StatusBadge status={apt.status} />
                          </div>
                          <p className="text-[#F0EDE8] text-sm mb-0.5">{apt.client_name}</p>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color! }} />
                            <span className="text-[#666] text-xs">{apt.dp_services?.name ?? '—'}</span>
                          </div>
                          <a
                            href={`https://wa.me/52${apt.client_phone.replace(/\D/g, '')}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[#444] hover:text-[#25D366] transition-colors text-xs w-fit"
                          >
                            <Phone size={10} /> {apt.client_phone}
                          </a>
                          {apt.notes && <p className="text-[#444] text-[11px] italic mt-1">{apt.notes}</p>}
                          {(apt.status === 'pending' || apt.status === 'pending_payment') && (
                            <div className="flex gap-2 mt-3">
                              <button onClick={() => updateStatus(apt.id, 'confirmed')} disabled={updating === apt.id}
                                className="flex items-center gap-1 text-[9px] tracking-[0.12em] uppercase border border-emerald-800 text-emerald-400 px-2.5 py-1.5 hover:bg-emerald-900/20 transition-colors disabled:opacity-40">
                                <Check size={10} /> Confirmar
                              </button>
                              <button onClick={() => updateStatus(apt.id, 'cancelled')} disabled={updating === apt.id}
                                className="flex items-center gap-1 text-[9px] tracking-[0.12em] uppercase border border-white/8 text-[#444] px-2.5 py-1.5 hover:border-red-800 hover:text-red-400 transition-colors disabled:opacity-40">
                                <X size={10} /> Cancelar
                              </button>
                            </div>
                          )}
                          {apt.status === 'confirmed' && (
                            <button onClick={() => updateStatus(apt.id, 'cancelled')} disabled={updating === apt.id}
                              className="mt-3 flex items-center gap-1 text-[9px] tracking-[0.12em] uppercase border border-white/8 text-[#444] px-2.5 py-1.5 hover:border-red-800 hover:text-red-400 transition-colors disabled:opacity-40">
                              <X size={10} /> Cancelar cita
                            </button>
                          )}
                        </div>
                      );
                    }

                    /* ── Appointment continuation ── */
                    if (row.appt && !row.apptIsStart) {
                      return (
                        <div key={i} className="flex items-center py-1.5 border-b border-white/[0.02]"
                          style={{ borderLeft: `2px solid ${color}28`, paddingLeft: '13px' }}>
                          <span className="text-[#252525] text-[10px]">{formatTime(row.time)}</span>
                        </div>
                      );
                    }

                    /* ── Block start ── */
                    if (row.block && row.blockIsStart) {
                      const blk = row.block;
                      return (
                        <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/5"
                          style={{ borderLeft: '3px solid rgba(239,68,68,0.5)', paddingLeft: '12px', background: 'rgba(239,68,68,0.03)' }}>
                          <div>
                            <span className="text-red-400/80 text-xs">
                              {blk.all_day ? 'Día completo bloqueado' : formatTime(row.time)}
                            </span>
                            {!blk.all_day && blk.end_time && (
                              <span className="text-[#555] text-xs ml-1">→ {formatTime(blk.end_time)}</span>
                            )}
                            {blk.reason && <span className="text-[#444] text-xs ml-2">· {blk.reason}</span>}
                          </div>
                          <button onClick={() => handleDeleteBlock(blk.id)} disabled={deleting === blk.id}
                            className="text-[#333] hover:text-red-400 transition-colors disabled:opacity-40 p-1 ml-3 shrink-0">
                            {deleting === blk.id
                              ? <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                              : <Trash2 size={12} />}
                          </button>
                        </div>
                      );
                    }

                    /* ── Block continuation ── */
                    if (row.block && !row.blockIsStart) {
                      return (
                        <div key={i} className="flex items-center py-1.5 border-b border-white/[0.02]"
                          style={{ borderLeft: '2px solid rgba(239,68,68,0.15)', paddingLeft: '13px', background: 'rgba(239,68,68,0.01)' }}>
                          <span className="text-[#252525] text-[10px]">{formatTime(row.time)}</span>
                        </div>
                      );
                    }

                    /* ── Free slot ── */
                    return (
                      <div key={i} className="flex items-center gap-3 py-2 border-b border-white/[0.03]"
                        style={{ paddingLeft: '15px' }}>
                        <span className="text-[#2a2a2a] text-[10px] w-16 shrink-0">{formatTime(row.time)}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full" style={{ background: '#1a3d1a' }} />
                          <span className="text-[10px] tracking-[0.08em] uppercase" style={{ color: '#1e3d1e' }}>libre</span>
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
                  className="flex items-center gap-2 text-[9px] tracking-[0.15em] uppercase border border-white/8 text-[#555] px-3 py-2 hover:border-red-900 hover:text-red-400 transition-colors"
                >
                  <CalendarOff size={12} /> Bloquear horas de este día
                </button>
              ) : (
                <div className="border border-white/8 p-4 mt-2">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-[#555]">Bloquear horario</p>
                    <button onClick={() => { setShowBlockForm(false); setBlockReason(''); }} className="text-[#444] hover:text-white transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex gap-2 mb-4">
                    {[{ v: true, l: 'Día completo' }, { v: false, l: 'Rango de horas' }].map(({ v, l }) => (
                      <button key={l} onClick={() => setAllDay(v)}
                        className={`flex-1 py-2 text-[9px] tracking-[0.12em] uppercase border transition-colors ${allDay === v ? 'border-[#C9A84C]/50 text-[#C9A84C]' : 'border-white/8 text-[#555] hover:border-white/20'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                  {!allDay && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {[{ label: 'Desde', val: blockStart, set: setBlockStart }, { label: 'Hasta', val: blockEnd, set: setBlockEnd }].map(({ label, val, set }) => (
                        <div key={label}>
                          <label className="block text-[9px] tracking-[0.15em] uppercase text-[#555] mb-1.5">{label}</label>
                          <input type="time" value={val} onChange={(e) => set(e.target.value)}
                            className="w-full bg-transparent border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]/50" style={{ fontSize: '16px' }} />
                        </div>
                      ))}
                    </div>
                  )}
                  <input type="text" value={blockReason} onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Motivo (opcional)"
                    className="w-full bg-transparent border border-white/10 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]/50 placeholder:text-white/15 mb-4" style={{ fontSize: '16px' }} />
                  <button onClick={handleBlock} disabled={saving}
                    className="w-full flex items-center justify-center gap-2 border border-red-900 text-red-400 py-3 text-[10px] tracking-[0.15em] uppercase hover:bg-red-900/15 transition-colors disabled:opacity-40">
                    {saving ? <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" /> : <CalendarOff size={12} />}
                    {saving ? 'Bloqueando...' : 'Confirmar bloqueo'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ── NO DAY SELECTED: UPCOMING LIST ── */
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#555] mb-5">Próximas citas</p>
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-4 h-4 border border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : Object.keys(upcomingByDate).length === 0 ? (
                <div className="border border-white/5 py-16 text-center">
                  <p className="text-[#444] text-sm">No hay citas próximas.</p>
                  <p className="text-[#333] text-xs mt-1">Selecciona un día en el calendario para ver o gestionar.</p>
                </div>
              ) : (
                <div>
                  {Object.keys(upcomingByDate).sort().map((date, di) => (
                    <div key={date} className={di > 0 ? 'mt-8' : ''}>
                      <button
                        onClick={() => setSelectedDate(parseISO(date + 'T12:00:00'))}
                        className="flex items-baseline gap-2 mb-3 group w-full text-left"
                      >
                        <span className="font-[family-name:var(--font-display)] text-xl font-light text-white group-hover:text-[#C9A84C] transition-colors capitalize">
                          {dayLabel(date)}
                        </span>
                        <span className="text-[10px] tracking-[0.15em] uppercase text-[#444] capitalize">
                          {format(parseISO(date + 'T12:00:00'), "d 'de' MMMM", { locale: es })}
                        </span>
                        <span className="ml-auto text-[9px] text-[#333]">
                          {upcomingByDate[date].length} cita{upcomingByDate[date].length !== 1 ? 's' : ''}
                        </span>
                      </button>
                      <div>
                        {upcomingByDate[date].map((apt) => {
                          const color = serviceColor(apt.dp_services?.name);
                          return (
                            <div
                              key={apt.id}
                              className="border-b border-white/5 py-3 cursor-pointer hover:bg-white/[0.01] transition-colors"
                              style={{ borderLeft: `3px solid ${color}`, paddingLeft: '12px' }}
                              onClick={() => setSelectedDate(parseISO(date + 'T12:00:00'))}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-white text-xs font-medium shrink-0">{formatTime(apt.start_time)}</span>
                                  <span className="text-[#F0EDE8] text-sm truncate">{apt.client_name}</span>
                                  <span className="text-[#555] text-xs hidden sm:inline truncate">{apt.dp_services?.name}</span>
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

// ── Trusted clients tab ───────────────────────────────────────────
interface TrustedClient { id: string; name: string; phone: string; notes: string | null; }

function TrustedClientsTab() {
  const [clients, setClients]             = useState<TrustedClient[]>([]);
  const [loading, setLoading]             = useState(false);
  const [deleting, setDeleting]           = useState<string | null>(null);
  const [saving, setSaving]               = useState(false);
  const [name, setName]                   = useState('');
  const [countryCode, setCountryCode]     = useState('+52');
  const [phone, setPhone]                 = useState('');
  const [notes, setNotes]                 = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/trusted-clients');
      const data = await res.json();
      setClients(data.clients ?? []);
    } catch { setClients([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!name.trim() || phone.length !== 10) return;
    setSaving(true);
    try {
      const res = await fetch('/api/trusted-clients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: `${countryCode.trim()} ${phone.trim()}`, notes: notes.trim() || null }),
      });
      if (res.ok) {
        const client = await res.json();
        setClients((prev) => [...prev, client].sort((a, b) => a.name.localeCompare(b.name)));
        setName(''); setPhone(''); setNotes(''); setCountryCode('+52');
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await fetch('/api/trusted-clients', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      setClients((prev) => prev.filter((c) => c.id !== id));
    } finally { setDeleting(null); }
  };

  return (
    <div className="space-y-8">
      <p className="text-[#555] text-sm leading-relaxed">
        Clientas en esta lista reservan sin anticipo. Se reconocen automáticamente por su número de WhatsApp.
      </p>

      <div>
        <p className="text-[10px] tracking-[0.3em] uppercase text-[#555] mb-4">Agregar clienta frecuente</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[10px] tracking-[0.15em] uppercase text-[#555] mb-2">Nombre</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo"
              className="w-full bg-transparent border border-white/10 text-white px-4 py-3 focus:outline-none focus:border-[#C9A84C]/60 transition-colors placeholder:text-white/15"
              style={{ fontSize: '16px' }} />
          </div>
          <div>
            <label className="block text-[10px] tracking-[0.15em] uppercase text-[#555] mb-2">
              WhatsApp <span className="normal-case tracking-normal text-[#333]">— 10 dígitos</span>
            </label>
            <div className="flex border border-white/10 focus-within:border-[#C9A84C]/60 transition-colors">
              <input type="text" value={countryCode} onChange={(e) => setCountryCode(e.target.value)}
                className="w-14 bg-transparent text-[#888] px-2 py-3 text-center focus:outline-none border-r border-white/10 shrink-0"
                style={{ fontSize: '16px' }} />
              <input type="tel" inputMode="numeric" value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="669 123 4567"
                className="flex-1 bg-transparent text-white px-3 py-3 focus:outline-none placeholder:text-white/15"
                style={{ fontSize: '16px' }} />
              {phone.length > 0 && (
                <span className={`flex items-center pr-3 text-[10px] shrink-0 ${phone.length === 10 ? 'text-emerald-500' : 'text-[#444]'}`}>
                  {phone.length}/10
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-[10px] tracking-[0.15em] uppercase text-[#555] mb-2">Notas (opcional)</label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: clienta desde 2022, prefiere tinte oscuro..."
            className="w-full bg-transparent border border-white/10 text-white px-4 py-3 focus:outline-none focus:border-[#C9A84C]/60 transition-colors placeholder:text-white/15"
            style={{ fontSize: '16px' }} />
        </div>
        <button onClick={handleAdd} disabled={saving || !name.trim() || phone.length !== 10}
          className="flex items-center gap-2 bg-[#C9A84C] text-black px-6 py-3 text-[10px] tracking-[0.2em] uppercase font-semibold hover:bg-[#dbb85e] transition-colors disabled:opacity-30">
          {saving ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <UserPlus size={13} />}
          Agregar
        </button>
      </div>

      <div>
        <p className="text-[10px] tracking-[0.3em] uppercase text-[#555] mb-4 flex items-center gap-2">
          <Star size={11} /> {clients.length} frecuentes registradas
        </p>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-4 h-4 border border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-12 border border-white/5">
            <p className="text-[#444] text-sm">Ninguna clienta frecuente registrada.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {clients.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-3.5">
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] shrink-0" />
                  <div>
                    <p className="text-white text-sm">{c.name}</p>
                    <p className="text-[#555] text-xs mt-0.5">{c.phone}{c.notes && <span className="text-[#333]"> · {c.notes}</span>}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id}
                  className="text-[#333] hover:text-red-400 transition-colors disabled:opacity-40 p-1.5">
                  {deleting === c.id ? <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab]       = useState<Tab>('agenda');

  if (!authed) return <AuthScreen onAuth={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen font-[family-name:var(--font-body)]" style={{ background: '#000' }}>
      <div className="border-b border-white/8 px-5 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-[#555] hover:text-[#C9A84C] transition-colors">
          <ArrowLeft size={15} />
          <span className="hidden sm:inline text-xs tracking-wider uppercase">Sitio</span>
        </Link>
        <span className="font-[family-name:var(--font-display)] text-xs tracking-[0.3em] uppercase text-[#C9A84C]">Admin</span>
        <div className="w-10 sm:w-16" />
      </div>

      {/* 2 tabs */}
      <div className="border-b border-white/8 flex">
        {([
          { key: 'agenda',     label: 'Agenda',     icon: <Calendar size={13} /> },
          { key: 'frecuentes', label: 'Frecuentes', icon: <Star size={13} /> },
        ] as { key: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-6 py-4 text-[10px] tracking-[0.2em] uppercase border-b-2 transition-colors ${
              tab === t.key ? 'border-[#C9A84C] text-[#C9A84C]' : 'border-transparent text-[#555] hover:text-[#888]'
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <div className="max-w-4xl mx-auto px-5 py-8">
        {tab === 'agenda'     && <AgendaTab />}
        {tab === 'frecuentes' && <TrustedClientsTab />}
      </div>
    </div>
  );
}
