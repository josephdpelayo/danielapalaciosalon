interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 md:mb-8">
      <div>
        {eyebrow && <p className="text-[9px] uppercase tracking-[0.35em] text-stone mb-2">{eyebrow}</p>}
        <h1 className="font-[family-name:var(--font-display)] font-light text-2xl md:text-3xl text-cream">
          {title}
        </h1>
        {description && <p className="text-[13px] text-muted mt-1.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
