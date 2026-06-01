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
  const debug     = searchParams.get('debug') === '1';

  if (!serviceId) return NextResponse.json({ error: 'Missing service_id' }, { status: 400 });

  // Build date range
  const fromDate = new Date(fromParam + 'T12:00:00');
  const dateRange: string[] = [];
  for (let i = 0; i < days; i++) {
    dateRange.push(format(addDays(fromDate, i), 'yyyy-MM-dd'));
  }

  if (!(await import('@/lib/supabase')).supabaseReady) {
    const blocked = dateRange.filter((d) => {
      const dow = getDay(new Date(d + 'T12:00:00'));
      return !MOCK_SCHEDULE.find((s) => s.day_of_week === dow && s.is_active);
    });
    return NextResponse.json({ blocked_dates: blocked });
  }

  const { supabaseAdmin: supabase } = await import('@/lib/supabase');

  // 1. Global schedule (which days of week the salon is open)
  const { data: scheduleRows } = await supabase.from('dp_schedule').select('day_of_week, is_active');
  const scheduleSource = scheduleRows?.length ? scheduleRows : MOCK_SCHEDULE;
  const activeDoW = new Set(scheduleSource.filter((s) => s.is_active).map((s) => s.day_of_week));

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
  let staffIds: string[] = (staffSvcRows ?? []).map((r) => r.staff_id as string);

  // Fallback: if no assignments configured, use ALL active staff
  if (staffIds.length === 0) {
    const { data: allStaff } = await supabase
      .from('dp_staff')
      .select('id')
      .eq('is_active', true);
    staffIds = (allStaff ?? []).map((r) => r.id as string);
  }

  // 4. Per-staff weekly schedule: staff_id → Set of day_of_week they work
  // If a staff has no schedule rows → treated as working all days the salon is open
  const staffWorkDays = new Map<string, Set<number> | 'all'>(); // 'all' = follows global schedule
  if (staffIds.length > 0) {
    const { data: staffSchedRows } = await supabase
      .from('dp_staff_schedule')
      .select('staff_id, day_of_week, is_active')
      .in('staff_id', staffIds);

    // Group by staff_id
    const byStaff = new Map<string, Array<{ day_of_week: number; is_active: boolean }>>();
    for (const row of staffSchedRows ?? []) {
      if (!byStaff.has(row.staff_id)) byStaff.set(row.staff_id, []);
      byStaff.get(row.staff_id)!.push({ day_of_week: row.day_of_week, is_active: row.is_active });
    }

    for (const sid of staffIds) {
      const rows = byStaff.get(sid);
      if (!rows || rows.length === 0) {
        staffWorkDays.set(sid, 'all'); // no schedule configured → follows salon hours
      } else {
        const workDays = new Set(rows.filter((r) => r.is_active).map((r) => r.day_of_week));
        staffWorkDays.set(sid, workDays);
      }
    }
  }

  // 5. Specific-date absences: date → Set<staff_id>
  const absentMap = new Map<string, Set<string>>();
  if (staffIds.length > 0) {
    const { data: absRows } = await supabase
      .from('dp_staff_absences')
      .select('staff_id, absence_date')
      .in('staff_id', staffIds)
      .gte('absence_date', dateRange[0])
      .lte('absence_date', dateRange[dateRange.length - 1]);
    for (const row of absRows ?? []) {
      const d = row.absence_date as string;
      if (!absentMap.has(d)) absentMap.set(d, new Set());
      absentMap.get(d)!.add(row.staff_id as string);
    }
  }

  // 6. For each date: block if salon closed OR no staff available
  const blocked_dates: string[] = [];

  for (const d of dateRange) {
    const dow = getDay(new Date(d + 'T12:00:00'));

    // Salon closed this day of week
    if (!activeDoW.has(dow)) { blocked_dates.push(d); continue; }

    // All-day admin block
    if (allDayBlockedSet.has(d)) { blocked_dates.push(d); continue; }

    // No staff configured at all → rely on business schedule only
    if (staffIds.length === 0) continue;

    const absentToday = absentMap.get(d) ?? new Set<string>();

    // A staff member is available if: works this day of week AND not absent today
    const anyAvailable = staffIds.some((sid) => {
      const workDays = staffWorkDays.get(sid);
      const worksToday = workDays === 'all' ? true : (workDays?.has(dow) ?? false);
      return worksToday && !absentToday.has(sid);
    });

    if (!anyAvailable) { blocked_dates.push(d); continue; }
  }

  if (debug) {
    return NextResponse.json({
      blocked_dates,
      _debug: {
        activeDoW: [...activeDoW],
        allDayBlockedSet: [...allDayBlockedSet],
        staffIds,
        staffWorkDays: Object.fromEntries(
          [...staffWorkDays.entries()].map(([k, v]) => [k, v === 'all' ? 'all' : [...v]])
        ),
        absentMap: Object.fromEntries([...absentMap.entries()].map(([k, v]) => [k, [...v]])),
        dateRange: dateRange.slice(0, 14),
      },
    });
  }

  return NextResponse.json({ blocked_dates });
}
