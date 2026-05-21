import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET() {
  if (!(await import('@/lib/supabase')).supabaseReady) {
    return NextResponse.json({ settings: {} });
  }
  const { supabase } = await import('@/lib/supabase');
  const { data } = await supabase.from('dp_settings').select('key, value');
  const settings = Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  const body = await req.json();
  if (!(await import('@/lib/supabase')).supabaseReady) {
    return NextResponse.json({ ok: true });
  }

  const { supabase } = await import('@/lib/supabase');
  const now = new Date().toISOString();
  const rows = Object.entries(body as Record<string, string>).map(([key, value]) => ({
    key, value: String(value), updated_at: now,
  }));
  const { error } = await supabase.from('dp_settings').upsert(rows, { onConflict: 'key' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
