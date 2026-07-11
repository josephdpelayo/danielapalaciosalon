'use client';

import { addDays, format, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DayNavProps {
  date: Date;
  onChange: (date: Date) => void;
}

/** Prev/next day + "hoy" jump, used above the Day view's timeline. */
export function DayNav({ date, onChange }: DayNavProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <button
        onClick={() => onChange(addDays(date, -1))}
        className="p-2 text-muted hover:text-cream transition-colors"
        aria-label="Día anterior"
      >
        <ChevronLeft size={16} strokeWidth={1.5} />
      </button>
      <div className="text-center">
        <p className="text-[13px] text-cream capitalize">{format(date, "EEEE d 'de' MMMM", { locale: es })}</p>
        {!isToday(date) && (
          <button
            onClick={() => onChange(new Date())}
            className="text-[10px] uppercase tracking-[0.15em] text-stone-light hover:text-cream transition-colors mt-0.5"
          >
            Ir a hoy
          </button>
        )}
      </div>
      <button
        onClick={() => onChange(addDays(date, 1))}
        className="p-2 text-muted hover:text-cream transition-colors"
        aria-label="Día siguiente"
      >
        <ChevronRight size={16} strokeWidth={1.5} />
      </button>
    </div>
  );
}
