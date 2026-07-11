import { cn } from '@/lib/cn';

interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 16, className }: SpinnerProps) {
  return (
    <span
      className={cn('inline-block border-stone/30 border-t-stone rounded-full animate-spin', className)}
      style={{ width: size, height: size, borderWidth: Math.max(1.5, size / 10) }}
      aria-label="Cargando"
      role="status"
    />
  );
}
