'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Bell, BellOff, LogOut } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAdminAuth } from '@/lib/admin/auth-context';
import { usePush } from '@/lib/hooks/usePush';
import { NAV_ITEMS } from './nav-items';

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(href + '/');
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAdminAuth();
  const push = usePush();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex md:flex-col w-56 border-r border-white/8 flex-shrink-0">
        <div className="px-5 py-6 border-b border-white/8">
          <p className="font-[family-name:var(--font-display)] text-lg text-cream font-light">Admin</p>
          <p className="text-[9px] tracking-[0.3em] uppercase text-stone mt-1">Daniela Palacio</p>
        </div>
        <nav className="flex-1 py-4">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-5 py-3 text-[12px] uppercase tracking-[0.1em] transition-colors border-l-2',
                  active
                    ? 'border-stone text-cream bg-white/[0.03]'
                    : 'border-transparent text-muted hover:text-cream hover:bg-white/[0.02]'
                )}
              >
                <Icon size={15} strokeWidth={1.4} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t border-white/8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-muted hover:text-stone transition-colors text-[11px]">
            <ArrowLeft size={13} strokeWidth={1.4} />
            Sitio
          </Link>
          <button onClick={logout} className="text-muted hover:text-red-400 transition-colors" title="Cerrar sesión">
            <LogOut size={14} strokeWidth={1.4} />
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-white/8">
          <span className="md:hidden font-[family-name:var(--font-display)] text-sm tracking-[0.2em] uppercase text-stone">
            Admin
          </span>
          <div className="hidden md:block" />
          <button
            onClick={() => {
              if (push.enabled) return;
              push.register();
            }}
            title={push.enabled ? 'Notificaciones activas' : 'Activar notificaciones'}
            className={cn('transition-colors p-1', push.enabled ? 'text-emerald-400' : 'text-muted hover:text-stone')}
          >
            {push.enabled ? <Bell size={16} strokeWidth={1.4} /> : <BellOff size={16} strokeWidth={1.4} />}
          </button>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 pb-24 md:pb-6 min-w-0">{children}</main>
      </div>

      {/* Bottom tabs — mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-white/8 flex overflow-x-auto scrollbar-none z-40">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                'flex-1 min-w-[64px] flex flex-col items-center gap-1 py-2.5 text-[9px] uppercase tracking-[0.05em]',
                active ? 'text-cream' : 'text-muted'
              )}
            >
              <Icon size={17} strokeWidth={1.4} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
