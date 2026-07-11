import { cn } from '@/lib/cn';

export type BadgeTone = 'confirmed' | 'pending' | 'unpaid' | 'cancelled' | 'completed' | 'waiting' | 'booked' | 'neutral';

const toneClasses: Record<BadgeTone, string> = {
  confirmed: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  pending: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  unpaid: 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  cancelled: 'bg-red-400/10 text-red-400 border-red-400/20',
  completed: 'bg-violet-400/10 text-violet-400 border-violet-400/20',
  waiting: 'bg-stone/10 text-stone-light border-stone/20',
  booked: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  neutral: 'bg-white/5 text-muted border-white/10',
};

const toneLabels: Record<BadgeTone, string> = {
  confirmed: 'Confirmada',
  pending: 'Pendiente',
  unpaid: 'Sin pagar',
  cancelled: 'Cancelada',
  completed: 'Completada',
  waiting: 'En espera',
  booked: 'Agendada',
  neutral: '—',
};

/** Única fuente de verdad del mapeo estado (citas/waitlist) -> tono visual. */
export function statusToTone(status: string): BadgeTone {
  switch (status) {
    case 'confirmed':
      return 'confirmed';
    case 'pending':
      return 'pending';
    case 'pending_payment':
      return 'unpaid';
    case 'cancelled':
      return 'cancelled';
    case 'completed':
      return 'completed';
    case 'waiting':
      return 'waiting';
    case 'notified':
      return 'pending';
    case 'booked':
      return 'booked';
    default:
      return 'neutral';
  }
}

interface BadgeProps {
  tone: BadgeTone;
  children?: React.ReactNode;
  className?: string;
}

export function Badge({ tone, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.15em]',
        toneClasses[tone],
        className
      )}
    >
      {children ?? toneLabels[tone]}
    </span>
  );
}
