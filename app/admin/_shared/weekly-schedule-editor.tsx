'use client';

import { cn } from '@/lib/cn';

export const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DAYS_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Lun–Dom

export interface WeeklyScheduleDay {
  day_of_week: number;
  is_active: boolean;
  start_time: string;
  end_time: string;
  break_start?: string | null;
  break_end?: string | null;
}

interface WeeklyScheduleEditorProps {
  days: WeeklyScheduleDay[];
  onChange: (dayOfWeek: number, updates: Partial<WeeklyScheduleDay>) => void;
  allowBreaks?: boolean;
}

const DEFAULT_DAY = (dow: number): WeeklyScheduleDay => ({
  day_of_week: dow,
  is_active: false,
  start_time: '10:00',
  end_time: '19:00',
  break_start: null,
  break_end: null,
});

/**
 * Editor de horario semanal — compartido entre Config (horario global, dp_schedule)
 * y Staff (horario por persona, dp_staff_schedule). Antes había dos implementaciones
 * casi idénticas duplicadas en cada uno.
 */
export function WeeklyScheduleEditor({ days, onChange, allowBreaks = true }: WeeklyScheduleEditorProps) {
  return (
    <div>
      {DAYS_ORDER.map((dow) => {
        const day = days.find((d) => d.day_of_week === dow) ?? DEFAULT_DAY(dow);
        const hasBreak = !!(day.break_start && day.break_end);
        return (
          <div key={dow} className={cn('py-3 border-b border-white/8', !day.is_active && 'opacity-50')}>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => onChange(dow, { is_active: !day.is_active })}
                className={cn(
                  'w-9 h-5 rounded-full relative transition-colors shrink-0',
                  day.is_active ? 'bg-stone' : 'bg-white/10'
                )}
                aria-label={day.is_active ? 'Desactivar día' : 'Activar día'}
              >
                <span
                  className={cn(
                    'absolute top-0.5 w-4 h-4 rounded-full bg-cream transition-all',
                    day.is_active ? 'left-4' : 'left-0.5'
                  )}
                />
              </button>
              <span className="text-sm w-20 shrink-0 text-cream">{DAYS_ES[dow]}</span>
              {day.is_active ? (
                <div className="flex items-center gap-1 flex-1 min-w-0 flex-wrap">
                  <input
                    type="time"
                    value={day.start_time}
                    onChange={(e) => onChange(dow, { start_time: e.target.value })}
                    className="bg-transparent border border-white/10 text-cream px-2 py-1.5 text-base focus:outline-none focus:border-stone/60 flex-1 min-w-[96px]"
                  />
                  <span className="text-muted text-xs">—</span>
                  <input
                    type="time"
                    value={day.end_time}
                    onChange={(e) => onChange(dow, { end_time: e.target.value })}
                    className="bg-transparent border border-white/10 text-cream px-2 py-1.5 text-base focus:outline-none focus:border-stone/60 flex-1 min-w-[96px]"
                  />
                  {allowBreaks && (
                    <button
                      onClick={() =>
                        onChange(dow, hasBreak ? { break_start: null, break_end: null } : { break_start: '14:00', break_end: '16:00' })
                      }
                      className={cn(
                        'text-[9px] tracking-[0.12em] uppercase px-2 py-1.5 border transition-colors shrink-0',
                        hasBreak ? 'border-stone/40 text-stone' : 'border-white/10 text-muted hover:border-white/25 hover:text-stone-light'
                      )}
                    >
                      {hasBreak ? 'Descanso ✓' : '+ Descanso'}
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-white/20 text-xs">Cerrado</span>
              )}
            </div>
            {allowBreaks && day.is_active && hasBreak && (
              <div className="flex items-center gap-1 mt-2 ml-[116px] flex-wrap">
                <span className="text-muted text-[10px] tracking-[0.1em] uppercase shrink-0">Descanso</span>
                <input
                  type="time"
                  value={day.break_start ?? '14:00'}
                  onChange={(e) => onChange(dow, { break_start: e.target.value })}
                  className="bg-transparent border border-white/10 text-stone-light px-2 py-1 text-base focus:outline-none focus:border-stone/60 flex-1 min-w-[96px]"
                />
                <span className="text-muted text-xs">—</span>
                <input
                  type="time"
                  value={day.break_end ?? '16:00'}
                  onChange={(e) => onChange(dow, { break_end: e.target.value })}
                  className="bg-transparent border border-white/10 text-stone-light px-2 py-1 text-base focus:outline-none focus:border-stone/60 flex-1 min-w-[96px]"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
