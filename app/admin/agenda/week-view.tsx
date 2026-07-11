'use client';

import { useMemo } from 'react';
import { addDays, eachDayOfInterval, endOfWeek, format, getDay, isToday, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge, statusToTone } from '@/components/ui/badge';
import { formatTime } from '@/lib/slots';
import type { Appointment, BlockedSlot, ScheduleConfig } from '@/lib/types';

interface WeekViewProps {
  date: Date;
  schedule: ScheduleConfig[];
  appointments: Appointment[];
  blockedSlots: BlockedSlot[];
  onSelectDay: (date: Date) => void;
  onSelectAppointment: (apt: Appointment) => void;
  onWeekChange: (date: Date) => void;
}

const MAX_VISIBLE = 4;

/** 7 condensed mini-columns for the week containing `date` — new vs. the old admin, which only had a single-day drill-down. */
export function WeekView({
  date,
  schedule,
  appointments,
  blockedSlots,
  onSelectDay,
  onSelectAppointment,
  onWeekChange,
}: WeekViewProps) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  const days = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd]);

  const byDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of appointments) {
      if (a.status === 'cancelled') continue;
      (map[a.appointment_date] ??= []).push(a);
    }
    for (const key of Object.keys(map)) map[key].sort((a, b) => a.start_time.localeCompare(b.start_time));
    return map;
  }, [appointments]);

  const blockedDates = useMemo(
    () => new Set(blockedSlots.filter((b) => b.all_day).map((b) => b.block_date)),
    [blockedSlots]
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onWeekChange(addDays(date, -7))}
          className="p-2 text-muted hover:text-cream transition-colors"
          aria-label="Semana anterior"
        >
          <ChevronLeft size={16} strokeWidth={1.5} />
        </button>
        <p className="text-[11px] uppercase tracking-[0.2em] text-stone-light">
          {format(weekStart, 'd MMM', { locale: es })} – {format(weekEnd, 'd MMM yyyy', { locale: es })}
        </p>
        <button
          onClick={() => onWeekChange(addDays(date, 7))}
          className="p-2 text-muted hover:text-cream transition-colors"
          aria-label="Semana siguiente"
        >
          <ChevronRight size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-7 gap-px bg-white/8 border border-white/8">
        {days.map((d) => {
          const key = format(d, 'yyyy-MM-dd');
          const dow = getDay(d);
          const daySchedule = schedule.find((s) => s.day_of_week === dow);
          const dayAppts = byDate[key] ?? [];
          const closed = !daySchedule?.is_active;
          const blocked = blockedDates.has(key);

          return (
            <div key={key} className="bg-surface min-h-[190px] flex flex-col">
              <button
                onClick={() => onSelectDay(d)}
                className="px-2.5 py-2 border-b border-white/8 text-left hover:bg-white/[0.03] transition-colors"
              >
                <p
                  className={cn(
                    'text-[10px] uppercase tracking-[0.15em]',
                    isToday(d) ? 'text-cream' : 'text-muted'
                  )}
                >
                  {format(d, 'EEE d', { locale: es })}
                </p>
                <p className="text-[9px] text-muted mt-0.5">
                  {closed
                    ? 'Cerrado'
                    : blocked
                      ? 'Bloqueado'
                      : dayAppts.length > 0
                        ? `${dayAppts.length} cita${dayAppts.length > 1 ? 's' : ''}`
                        : 'Libre'}
                </p>
              </button>
              <div className="flex-1 p-1.5 space-y-1 overflow-y-auto">
                {dayAppts.slice(0, MAX_VISIBLE).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => onSelectAppointment(a)}
                    className="w-full text-left px-1.5 py-1 border border-white/8 hover:border-stone/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[9px] text-cream/80 truncate">{formatTime(a.start_time)}</span>
                      <Badge tone={statusToTone(a.status)} className="scale-90 origin-right" />
                    </div>
                    <p className="text-[10px] text-cream truncate">{a.client_name}</p>
                  </button>
                ))}
                {dayAppts.length > MAX_VISIBLE && (
                  <p className="text-[9px] text-muted px-1.5">+{dayAppts.length - MAX_VISIBLE} más</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
