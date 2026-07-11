import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { MOCK_SCHEDULE } from '@/lib/mock-data';

export async function GET(_req: NextRequest) {
  if (!(await import('@/lib/supabase')).supabaseReady) {
    return NextResponse.json({ schedule: MOCK_SCHEDULE });
  }
  const { supabase } = await import('@/lib/supabase');
  const { data, error } = await supabase.from('dp_schedule').select('*').order('day_of_week');
  if (error || !data?.length) return NextResponse.json({ schedule: MOCK_SCHEDULE });
  return NextResponse.json({ schedule: data });
}

export async function PATCH(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  const body = await req.json();
  const { day_of_week, ...updates } = body;
  if (day_of_week === undefined) return NextResponse.json({ error: 'Missing day_of_week' }, { status: 400 });

  if (!(await import('@/lib/supabase')).supabaseReady) {
    return NextResponse.json({ ok: true });
  }

  const { supabaseAdmin: supabase } = await import('@/lib/supabase');
  const { error } = await supabase.from('dp_schedule').upsert(
    { day_of_week, ...updates },
    { onConflict: 'day_of_week' }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
