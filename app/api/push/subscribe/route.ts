import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  const subscription = await req.json();

  if (!(await import('@/lib/supabase')).supabaseReady) {
    return NextResponse.json({ ok: true });
  }

  const { supabase } = await import('@/lib/supabase');
  await supabase.from('dp_settings').upsert(
    { key: 'admin_push_subscription', value: JSON.stringify(subscription) },
    { onConflict: 'key' }
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  if (!(await import('@/lib/supabase')).supabaseReady) {
    return NextResponse.json({ ok: true });
  }

  const { supabase } = await import('@/lib/supabase');
  await supabase.from('dp_settings').delete().eq('key', 'admin_push_subscription');

  return NextResponse.json({ ok: true });
}
