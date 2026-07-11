'use client';

import { createContext, useCallback, useContext, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Detecta montaje en cliente sin setState-en-efecto (evita el warning de
// react-hooks/set-state-in-effect y el mismatch de hidratación con document.body).
function subscribeNoop() {
  return () => {};
}
function getClientSnapshot() {
  return true;
}
function getServerSnapshot() {
  return false;
}

const kindIcon: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 size={16} strokeWidth={1.5} className="text-emerald-400 flex-shrink-0" />,
  error: <XCircle size={16} strokeWidth={1.5} className="text-red-400 flex-shrink-0" />,
  info: <Info size={16} strokeWidth={1.5} className="text-stone flex-shrink-0" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const mounted = useSyncExternalStore(subscribeNoop, getClientSnapshot, getServerSnapshot);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value: ToastContextValue = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm">
            {toasts.map((t) => (
              <div
                key={t.id}
                className={cn(
                  'flex items-start gap-2.5 bg-surface-2 border border-white/10 px-4 py-3 text-[13px] text-cream shadow-2xl'
                )}
                style={{ animation: 'slideInRight 0.25s ease-out' }}
              >
                {kindIcon[t.kind]}
                <span className="flex-1">{t.message}</span>
                <button
                  onClick={() => dismiss(t.id)}
                  className="text-muted hover:text-cream transition-colors flex-shrink-0"
                  aria-label="Cerrar notificación"
                >
                  <X size={13} strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
