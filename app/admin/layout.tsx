import type { Metadata } from 'next';
import { AuthGate } from './_components/auth-gate';
import { AdminShell } from './_components/admin-shell';
import { ToastProvider } from '@/components/ui/toast-provider';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';

export const metadata: Metadata = {
  manifest: '/admin-manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DP Admin',
  },
  other: {
    'theme-color': '#0D0D0D',
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AuthGate>
          <AdminShell>{children}</AdminShell>
        </AuthGate>
      </ConfirmProvider>
    </ToastProvider>
  );
}
