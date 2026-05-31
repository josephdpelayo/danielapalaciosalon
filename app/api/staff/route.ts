import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { MOCK_STAFF } from '@/lib/mock-data';

export async function GET(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  if (!(await import('@/lib/supabase')).supabaseReady) {
    return NextResponse.json({ staff: MOCK_STAFF });
  }

  const { supabaseAdmin: supabase } = await import('@/lib/supabase');

  const { data: staffRows, error } = await supabase
    .from('dp_staff')
    .select('id, name, phone, is_active, created_at')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const staffIds = (staffRows ?? []).map((s) => s.id);

  const [schedRes, svcRes] = await Promise.all([
    staffIds.length
      ? supabase.from('dp_staff_schedule').select('*').in('staff_id', staffIds)
      : Promise.resolve({ data: [] }),
    staffIds.length
      ? supabase.from('dp_staff_services').select('staff_id, service_id').in('staff_id', staffIds)
      : Promise.resolve({ data: [] }),
  ]);

  const schedules: Record<string, object[]>   = {};
  const serviceMap: Record<string, string[]>  = {};

  for (const s of staffIds) { schedules[s] = []; serviceMap[s] = []; }
  for (const row of schedRes.data ?? []) {
    schedules[row.staff_id] ??= [];
    schedules[row.staff_id].push(row);
  }
  for (const row of svcRes.data ?? []) {
    serviceMap[row.staff_id] ??= [];
    serviceMap[row.staff_id].push(row.service_id);
  }

  const staff = (staffRows ?? []).map((s) => ({
    ...s,
    schedule:    schedules[s.id]  ?? [],
    service_ids: serviceMap[s.id] ?? [],
  }));

  return NextResponse.json({ staff });
}

export async function POST(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  if (!(await import('@/lib/supabase')).supabaseReady) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  }

  const body = await req.json();
  const { name, phone } = body;
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const { supabaseAdmin: supabase } = await import('@/lib/supabase');
  const { data, error } = await supabase
    .from('dp_staff')
    .insert({ name: name.trim(), is_active: true, phone: phone ?? null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ staff: { ...data, schedule: [], service_ids: [] } });
}

export async function PATCH(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  if (!(await import('@/lib/supabase')).supabaseReady) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  }

  const body = await req.json();
  const { id, name, is_active, phone, schedule, service_ids } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { supabaseAdmin: supabase } = await import('@/lib/supabase');

  // Update core fields
  if (name !== undefined || is_active !== undefined || phone !== undefined) {
    const patch: Record<string, unknown> = {};
    if (name      !== undefined) patch.name      = name;
    if (is_active !== undefined) patch.is_active = is_active;
    if (phone     !== undefined) patch.phone     = phone;
    await supabase.from('dp_staff').update(patch).eq('id', id);
  }

  // Upsert schedule days
  if (schedule) {
    for (const day of schedule as Array<{day_of_week:number; is_active:boolean; start_time:string; end_time:string; break_start?:string|null; break_end?:string|null}>) {
      await supabase.from('dp_staff_schedule').upsert({
        staff_id:    id,
        day_of_week: day.day_of_week,
        is_active:   day.is_active,
        start_time:  day.start_time,
        end_time:    day.end_time,
        break_start: day.break_start ?? null,
        break_end:   day.break_end   ?? null,
      }, { onConflict: 'staff_id,day_of_week' });
    }
  }

  // Replace service assignments
  if (service_ids !== undefined) {
    await supabase.from('dp_staff_services').delete().eq('staff_id', id);
    if (service_ids.length > 0) {
      await supabase.from('dp_staff_services').insert(
        service_ids.map((sid: string) => ({ staff_id: id, service_id: sid }))
      );
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  if (!(await import('@/lib/supabase')).supabaseReady) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { supabaseAdmin: supabase } = await import('@/lib/supabase');
  await supabase.from('dp_staff').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
