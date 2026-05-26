import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: 'CRON_SECRET not set' }, { status: 500 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://danielapalaciosalon.vercel.app';
  const res = await fetch(`${baseUrl}/api/cron/reminders`, {
    headers: { 'x-cron-secret': cronSecret },
  });
  const data = await res.json();
  return NextResponse.json(data);
}
