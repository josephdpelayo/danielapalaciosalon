import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
      {Icon && <Icon size={22} strokeWidth={1.2} className="text-stone-dim" />}
      <div>
        <p className="text-sm text-cream/80">{title}</p>
        {description && <p className="text-[12px] text-muted mt-1 max-w-xs mx-auto">{description}</p>}
      </div>
      {action}
    </div>
  );
}
