'use client';

import { cn } from '@/lib/cn';

interface TabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  items: { value: T; label: string }[];
  className?: string;
}

/** Selector segmentado — usado p.ej. para Día/Semana/Mes en Agenda. */
export function Tabs<T extends string>({ value, onChange, items, className }: TabsProps<T>) {
  return (
    <div className={cn('inline-flex border border-white/10', className)}>
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => onChange(item.value)}
          className={cn(
            'px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-semibold transition-colors',
            item.value === value ? 'bg-cream text-background' : 'text-stone-light hover:text-cream'
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
