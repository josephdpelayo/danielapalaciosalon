'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/** Panel deslizante desde la derecha — reutiliza el keyframe slideInRight ya definido en globals.css. */
export function Drawer({ open, onClose, title, children, className }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        className={cn(
          'absolute right-0 top-0 h-full w-full bg-surface-2 border-l border-white/10 overflow-y-auto',
          className
        )}
        style={{ maxWidth: 'min(480px, 100vw)', animation: 'slideInRight 0.3s ease-out' }}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/8 sticky top-0 bg-surface-2 z-10">
          {title && <h2 className="font-[family-name:var(--font-display)] font-light text-lg text-cream">{title}</h2>}
          <button
            onClick={onClose}
            className="text-muted hover:text-cream transition-colors p-1 ml-auto"
            aria-label="Cerrar"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
