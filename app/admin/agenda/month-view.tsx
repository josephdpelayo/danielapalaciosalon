'use client';

import { useMemo } from 'react';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { addDays, format, getDay, startOfToday } from 'date-fns';
import 'react-day-picker/dist/style.css';
import { densityColor, densityLabel } from './timeline-helpers';
import type { Appointment, BlockedSlot, ScheduleConfig } from '@/lib/types';

interface MonthViewProps {
  schedule: ScheduleConfig[];
  appointments: Appointment[];
  blockedSlots: BlockedSlot[];
  selected: Date;
  onSelect: (date: Date) => void;
}

const WINDOW_DAYS = 365;

/**
 * Density/heatmap calendar — colors days by how booked they are, using the REAL dp_schedule
 * (useSchedule) to know which days of the week the salon is actually open. The old admin
 * computed this same heatmap from a hardcoded MOCK_SCHEDULE, so a changed working day never
 * showed up here; this reads live data instead.
 */
export function MonthView({ schedule, appointments, blockedSlots, selected, onSelect }: MonthViewProps) {
  const apptCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of appointments) {
      if (a.status !== 'cancelled') counts[a.appointment_date] = (counts[a.appointment_date] ?? 0) + 1;
    }
    return counts;
  }, [appointments]);

  const blockedDates = useMemo(
    () => blockedSlots.filter((b) => b.all_day).map((b) => new Date(b.block_date + 'T12:00:00')),
    [blockedSlots]
  );

  const { libre, poco, medio, lleno } = useMemo(() => {
    const libre: Date[] = [];
    const poco: Date[] = [];
    const medio: Date[] = [];
    const lleno: Date[] = [];
    const today = startOfToday();
    for (let i = -WINDOW_DAYS; i <= WINDOW_DAYS; i++) {
      const d = addDays(today, i);
      const daySchedule = schedule.find((s) => s.day_of_week === getDay(d));
      if (!daySchedule?.is_active) continue;
      const key = format(d, 'yyyy-MM-dd');
      const c = apptCounts[key] ?? 0;
      if (c === 0) libre.push(d);
      else if (c <= 2) poco.push(d);
      else if (c <= 4) medio.push(d);
      else lleno.push(d);
    }
    return { libre, poco, medio, lleno };
  }, [schedule, apptCounts]);

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-3">
        {[0, 1, 3, 5].map((sample) => (
          <div key={sample} className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: densityColor(sample) }}
            />
            <span className="text-[9px] uppercase tracking-[0.15em] text-muted">{densityLabel(sample)}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-muted" />
          <span className="text-[9px] uppercase tracking-[0.15em] text-muted">Bloqueado</span>
        </div>
      </div>

      <div className="border border-white/8 overflow-x-auto flex justify-center py-2">
        <DayPicker
          mode="single"
          selected={selected}
          onSelect={(d) => d && onSelect(d)}
          locale={es}
          modifiers={{ libre, poco, medio, lleno, blocked: blockedDates }}
          modifiersStyles={{
            libre: { color: densityColor(0), fontWeight: 500 },
            poco: { color: densityColor(1) },
            medio: { color: densityColor(3) },
            lleno: { color: densityColor(5) },
            blocked: { color: '#7A7168', textDecoration: 'line-through' },
            selected: { backgroundColor: 'transparent', color: '#F5F0E8', fontWeight: 700, outline: 'none', boxShadow: 'none' },
            today: { color: '#81807F', fontWeight: 600 },
          }}
          styles={{
            day: { color: '#F5F0E8', borderRadius: '0', minWidth: '40px', minHeight: '40px' },
            caption_label: { color: '#F5F0E8', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' },
            weekday: { color: '#7A7168', textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '0.15em' },
            root: { background: 'transparent' },
            month: { width: '100%' },
          }}
        />
      </div>
    </div>
  );
}
