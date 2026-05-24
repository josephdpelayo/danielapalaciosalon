import type { Metadata } from 'next';

export const metadata: Metadata = {
  manifest: '/admin-manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DP Admin',
  },
  other: {
    'theme-color': '#F7F5F2',
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
