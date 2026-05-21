import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  if (!(await import("@/lib/supabase")).supabaseReady) return NextResponse.json({ blocks: [] });

  const { supabase } = await import('@/lib/supabase');
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('dp_blocked_slots')
    .select('*')
    .gte('block_date', today)
    .order('block_date')
    .order('start_time');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ blocks: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { block_date, start_time, end_time, reason, all_day } = body;

  if (!block_date) return NextResponse.json({ error: 'Missing block_date' }, { status: 400 });

  if (!(await import("@/lib/supabase")).supabaseReady) {
    return NextResponse.json({ id: 'mock-' + Date.now(), block_date, all_day, reason });
  }

  const { supabase } = await import('@/lib/supabase');
  const { data, error } = await supabase
    .from('dp_blocked_slots')
    .insert({ block_date, start_time: all_day ? null : start_time, end_time: all_day ? null : end_time, reason, all_day: !!all_day })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  if (!(await import("@/lib/supabase")).supabaseReady) return NextResponse.json({ ok: true });

  const { supabase } = await import('@/lib/supabase');
  const { error } = await supabase.from('dp_blocked_slots').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
