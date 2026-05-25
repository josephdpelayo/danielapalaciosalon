import { NextRequest, NextResponse } from 'next/server';
import { addDays, format } from 'date-fns';
import { generateTimeSlots } from '@/lib/slots';
import type { ScheduleConfig } from '@/lib/types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const serviceId     = searchParams.get('service_id');
  const afterDate     = searchParams.get('after'); // yyyy-MM-dd
  const duration      = parseInt(searchParams.get('duration')       ?? '60');
  const activeMinutes = parseInt(searchParams.get('active_minutes') ?? String(duration));

  if (!serviceId || !afterDate) return NextResponse.json({ date: null });
  if (!(await import('@/lib/supabase')).supabaseReady) return NextResponse.json({ date: null });

  const { supabaseAdmin: supabase } = await import('@/lib/supabase');

  // Which staff can do this service?
  const staffSvcRes = await supabase.from('dp_staff_services').select('staff_id').eq('service_id', serviceId);
  const capableIds = (staffSvcRes.data ?? []).map((r) => r.staff_id as string);
  if (capableIds.length === 0) return NextResponse.json({ date: null });

  const start      = new Date(afterDate + 'T12:00:00');
  const rangeStart = format(addDays(start, 1), 'yyyy-MM-dd');
  const rangeEnd   = format(addDays(start, 61), 'yyyy-MM-dd');

  // Fetch everything in one shot for the whole range
  const [schedRes, absenceRes, blockedRes, apptRes] = await Promise.all([
    supabase.from('dp_staff_schedule').select('*').in('staff_id', capableIds),
    supabase.from('dp_staff_absences').select('staff_id, absence_date').in('staff_id', capableIds).gte('absence_date', rangeStart).lte('absence_date', rangeEnd),
    supabase.from('dp_blocked_slots').select('block_date, start_time, end_time, all_day').gte('block_date', rangeStart).lte('block_date', rangeEnd),
    supabase.from('dp_appointments').select('staff_id, appointment_date, start_time, end_time, status, created_at').in('staff_id', capableIds).gte('appointment_date', rangeStart).lte('appointment_date', rangeEnd).neq('status', 'cancelled'),
  ]);

  const schedules  = schedRes.data  ?? [];
  const absences   = absenceRes.data ?? [];
  const blocked    = blockedRes.data ?? [];
  const appts      = apptRes.data   ?? [];

  const staleThreshold = new Date(Date.now() - 35 * 60 * 1000).toISOString();

  // Index absences and appointments by date
  const absentByDate = new Map<string, Set<string>>();
  for (const a of absences) {
    if (!absentByDate.has(a.absence_date)) absentByDate.set(a.absence_date, new Set());
    absentByDate.get(a.absence_date)!.add(a.staff_id as string);
  }

  const apptsByDateStaff = new Map<string, typeof appts>();
  for (const a of appts) {
    if (a.status === 'pending_payment' && a.created_at <= staleThreshold) continue;
    const key = `${a.appointment_date}__${a.staff_id}`;
    if (!apptsByDateStaff.has(key)) apptsByDateStaff.set(key, []);
    apptsByDateStaff.get(key)!.push(a);
  }

  const blockedByDate = new Map<string, typeof blocked>();
  for (const b of blocked) {
    if (!blockedByDate.has(b.block_date)) blockedByDate.set(b.block_date, []);
    blockedByDate.get(b.block_date)!.push(b);
  }

  // Iterate days and find first with real available slots
  for (let i = 1; i <= 60; i++) {
    const checkDate = addDays(start, i);
    const dateStr   = format(checkDate, 'yyyy-MM-dd');
    const dow       = checkDate.getDay();

    const dayBlocked = blockedByDate.get(dateStr) ?? [];
    if (dayBlocked.some((b) => b.all_day)) continue;

    const absent     = absentByDate.get(dateStr) ?? new Set();
    const presentIds = capableIds.filter((id) => !absent.has(id));
    if (presentIds.length === 0) continue;

    // For each present staff member, generate slots and check availability
    let hasAvailableSlot = false;
    for (const staffId of presentIds) {
      const sch = schedules.find((s) => s.staff_id === staffId && s.day_of_week === dow && s.is_active);
      if (!sch) continue;

      const staffSchedule: ScheduleConfig = {
        id: sch.id, day_of_week: dow, is_active: true,
        start_time: sch.start_time, end_time: sch.end_time,
        break_start: sch.break_start ?? null, break_end: sch.break_end ?? null,
      };

      const dayAppts = apptsByDateStaff.get(`${dateStr}__${staffId}`) ?? [];
      const slots = generateTimeSlots(staffSchedule, duration, activeMinutes, dayAppts as never, dayBlocked as never);

      if (slots.some((s) => s.available)) { hasAvailableSlot = true; break; }
    }

    if (hasAvailableSlot) return NextResponse.json({ date: dateStr });
  }

  return NextResponse.json({ date: null });
}
