import { NextRequest, NextResponse } from 'next/server';
import { addDays, format } from 'date-fns';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const serviceId = searchParams.get('service_id');
  const afterDate = searchParams.get('after'); // yyyy-MM-dd

  if (!serviceId || !afterDate) return NextResponse.json({ date: null });
  if (!(await import('@/lib/supabase')).supabaseReady) return NextResponse.json({ date: null });

  const { supabaseAdmin: supabase } = await import('@/lib/supabase');

  // Which staff can do this service?
  const staffSvcRes = await supabase.from('dp_staff_services').select('staff_id').eq('service_id', serviceId);
  const capableIds = (staffSvcRes.data ?? []).map((r) => r.staff_id as string);
  if (capableIds.length === 0) return NextResponse.json({ date: null });

  // Their weekly schedules
  const schedRes = await supabase.from('dp_staff_schedule').select('staff_id, day_of_week, is_active').in('staff_id', capableIds);
  const schedules = schedRes.data ?? [];

  // All absences for capable staff in the next 60 days (fetched once)
  const start = new Date(afterDate + 'T12:00:00');
  const rangeEnd = format(addDays(start, 61), 'yyyy-MM-dd');
  const rangeStart = format(addDays(start, 1), 'yyyy-MM-dd');

  const absenceRes = await supabase
    .from('dp_staff_absences')
    .select('staff_id, absence_date')
    .in('staff_id', capableIds)
    .gte('absence_date', rangeStart)
    .lte('absence_date', rangeEnd);

  const absentByDate = new Map<string, Set<string>>();
  for (const a of absenceRes.data ?? []) {
    if (!absentByDate.has(a.absence_date)) absentByDate.set(a.absence_date, new Set());
    absentByDate.get(a.absence_date)!.add(a.staff_id as string);
  }

  // All-day blocked slots in range
  const blockedRes = await supabase
    .from('dp_blocked_slots')
    .select('block_date')
    .gte('block_date', rangeStart)
    .lte('block_date', rangeEnd)
    .eq('all_day', true);
  const allDayBlocked = new Set((blockedRes.data ?? []).map((b) => b.block_date as string));

  // Iterate days
  for (let i = 1; i <= 60; i++) {
    const checkDate = addDays(start, i);
    const dateStr = format(checkDate, 'yyyy-MM-dd');
    const dow = checkDate.getDay();

    if (allDayBlocked.has(dateStr)) continue;

    const absent = absentByDate.get(dateStr) ?? new Set();
    const presentIds = capableIds.filter((id) => !absent.has(id));
    if (presentIds.length === 0) continue;

    const hasActiveDay = schedules.some(
      (s) => presentIds.includes(s.staff_id as string) && s.day_of_week === dow && s.is_active
    );
    if (hasActiveDay) return NextResponse.json({ date: dateStr });
  }

  return NextResponse.json({ date: null });
}
