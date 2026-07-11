import { LucideIcon } from 'lucide-react';
import { Card } from './card';
import { cn } from '@/lib/cn';

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaTone?: 'positive' | 'negative' | 'neutral';
  icon?: LucideIcon;
  className?: string;
}

const deltaClasses: Record<NonNullable<StatCardProps['deltaTone']>, string> = {
  positive: 'text-emerald-400',
  negative: 'text-red-400',
  neutral: 'text-muted',
};

export function StatCard({ label, value, delta, deltaTone = 'neutral', icon: Icon, className }: StatCardProps) {
  return (
    <Card className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        <p className="text-[9px] uppercase tracking-[0.3em] text-muted">{label}</p>
        {Icon && <Icon size={14} strokeWidth={1.4} className="text-stone" />}
      </div>
      <p className="font-[family-name:var(--font-display)] font-light text-3xl text-cream">{value}</p>
      {delta && <p className={cn('text-[10px] uppercase tracking-[0.15em]', deltaClasses[deltaTone])}>{delta}</p>}
    </Card>
  );
}
