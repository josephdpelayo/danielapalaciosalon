import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-white/5 animate-pulse', className)} />;
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/8">
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <Skeleton className="h-3 flex-1 max-w-[160px]" />
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-surface border border-white/8 p-4 md:p-6 flex flex-col gap-3">
      <Skeleton className="h-2.5 w-24" />
      <Skeleton className="h-7 w-16" />
    </div>
  );
}
