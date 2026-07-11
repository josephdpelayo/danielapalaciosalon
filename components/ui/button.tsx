'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './spinner';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-cream text-background hover:bg-[#E0DBD4] disabled:hover:bg-cream',
  secondary: 'bg-transparent border border-white/10 text-cream hover:border-stone/60 disabled:hover:border-white/10',
  ghost: 'bg-transparent text-stone-light hover:text-cream disabled:hover:text-stone-light',
  destructive: 'bg-transparent border border-red-400/30 text-red-400 hover:bg-red-400/10 disabled:hover:bg-transparent',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-[10px] gap-1.5',
  md: 'px-5 py-3 text-[11px] gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, disabled, className, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold uppercase tracking-[0.2em]',
        'transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <Spinner size={size === 'sm' ? 12 : 14} />
      ) : (
        icon
      )}
      {children}
    </button>
  );
});
