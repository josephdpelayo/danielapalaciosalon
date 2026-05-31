import { NextRequest, NextResponse } from 'next/server';
import { MOCK_SCHEDULE } from '@/lib/mock-data';
import { addDays, format, getDay } from 'date-fns';

// GET /api/available-dates?service_id=X&from=YYYY-MM-DD&days=60
// Returns blocked_dates: string[] — dates with zero availability for that service
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const serviceId = searchParams.get('service_id');
  const fromParam = searchParams.get('from') ?? format(new Date(), 'yyyy-MM-dd');
  const days      = Math.min(parseInt(searchParams.get('days') ?? '60'), 90);

  if (!serviceId) return NextResponse.json({ error: 'Missing service_id' }, { status: 400 });

  // Build date range
  const fromDate = new Date(fromParam + 'T12:00:00');
  const dateRange: string[] = [];
  for (let i = 0; i < days; i++) {
    dateRange.push(format(addDays(fromDate, i), 'yyyy-MM-dd'));
  }

  if (!(await import('@/lib/supabase')).supabaseReady) {
    // Mock fallback: block days not in global schedule
    const blocked = dateRange.filter((d) => {
      const dow = getDay(new Date(d + 'T12:00:00'));
      return !MOCK_SCHEDULE.find((s) => s.day_of_week === dow && s.is_active);
    });
    return NextResponse.json({ blocked_dates: blocked });
  }

  const { supabase } = await import('@/lib/supabase');

  // 1. Global schedule (which days of week are active)
  const { data: scheduleRows } = await supabase.from('dp_schedule').select('day_of_week, is_active');
  const activeDoW = new Set(
    (scheduleRows ?? MOCK_SCHEDULE).filter((s) => s.is_active).map((s) => s.day_of_week)
  );

  // 2. All-day global blocks in range
  const { data: allDayBlocks } = await supabase
    .from('dp_blocked_slots')
    .select('block_date')
    .eq('all_day', true)
    .gte('block_date', dateRange[0])
    .lte('block_date', dateRange[dateRange.length - 1]);
  const allDayBlockedSet = new Set((allDayBlocks ?? []).map((b) => b.block_date as string));

  // 3. Staff capable of this service
  const { data: staffSvcRows } = await supabase
    .from('dp_staff_services')
    .select('staff_id')
    .eq('service_id', serviceId);
  const capableIds: string[] = (staffSvcRows ?? []).map((r) => r.staff_id as string);

  // 4. Absences for capable staff in range
  let absentMap = new Map<string, Set<string>>(); // date → Set<staff_id>
  if (capableIds.length > 0) {
    const { data: absRows } = await supabase
      .from('dp_staff_absences')
      .select('staff_id, absence_date')
      .in('staff_id', capableIds)
      .gte('absence_date', dateRange[0])
      .lte('absence_date', dateRange[dateRange.length - 1]);
    for (const row of absRows ?? []) {
      const d = row.absence_date as string;
      if (!absentMap.has(d)) absentMap.set(d, new Set());
      absentMap.get(d)!.add(row.staff_id as string);
    }
  }

  // 5. Staff schedules (day_of_week active per staff)
  let staffActiveDoW = new Map<string, Set<number>>(); // staff_id → Set<day_of_week>
  if (capableIds.length > 0) {
    const { data: schRows } = await supabase
      .from('dp_staff_schedule')
      .select('staff_id, day_of_week, is_active')
      .in('staff_id', capableIds)
      .eq('is_active', true);
    for (const row of schRows ?? []) {
      if (!staffActiveDoW.has(row.staff_id as string)) staffActiveDoW.set(row.staff_id as string, new Set());
      staffActiveDoW.get(row.staff_id as string)!.add(row.day_of_week as number);
    }
  }

  // 6. For each date, determine if it's blocked
  const blocked_dates: string[] = [];

  for (const d of dateRange) {
    const dow = getDay(new Date(d + 'T12:00:00'));

    // Salon closed this day of week
    if (!activeDoW.has(dow)) { blocked_dates.push(d); continue; }

    // All-day admin block
    if (allDayBlockedSet.has(d)) { blocked_dates.push(d); continue; }

    // If no capable staff configured: use global schedule only (already checked above)
    if (capableIds.length === 0) continue;

    // Check if at least one capable staff is present AND working this day
    const absentToday = absentMap.get(d) ?? new Set<string>();
    const hasAvailableStaff = capableIds.some((id) => {
      if (absentToday.has(id)) return false;
      const staffDays = staffActiveDoW.get(id);
      // No staff schedule configured → fall back to global schedule (already checked above)
      if (!staffDays || staffDays.size === 0) return true;
      return staffDays.has(dow);
    });

    if (!hasAvailableStaff) { blocked_dates.push(d); continue; }
  }

  return NextResponse.json({ blocked_dates });
}
