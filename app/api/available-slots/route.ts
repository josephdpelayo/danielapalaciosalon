import { NextRequest, NextResponse } from 'next/server';
import { generateTimeSlots } from '@/lib/slots';
import { MOCK_SCHEDULE, MOCK_STAFF } from '@/lib/mock-data';
import { ScheduleConfig, TimeSlot } from '@/lib/types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date          = searchParams.get('date');
  const serviceId     = searchParams.get('service_id');
  const duration      = parseInt(searchParams.get('duration')       ?? '60');
  const activeMinutes = parseInt(searchParams.get('active_minutes') ?? String(duration));

  if (!date) return NextResponse.json({ error: 'Missing date' }, { status: 400 });

  const dow = new Date(date + 'T12:00:00').getDay();

  type ApptRow = { start_time: string; end_time: string; status: string; active_minutes?: number };
  let blockedSlots: Array<{ start_time: string | null; end_time: string | null; all_day: boolean }> = [];

  if ((await import('@/lib/supabase')).supabaseReady) {
    const { supabaseAdmin: supabase } = await import('@/lib/supabase');

    // Fetch global blocked slots (apply to all staff)
    const blockRes = await supabase
      .from('dp_blocked_slots')
      .select('start_time, end_time, all_day')
      .eq('block_date', date);
    if (!blockRes.error) blockedSlots = blockRes.data ?? [];

    // All-day block = salon intentionally closed
    if (blockedSlots.some((b) => b.all_day)) {
      return NextResponse.json({ slots: [], reason: 'blocked' });
    }

    // ── Multi-staff path ─────────────────────────────────────
    if (serviceId) {
      const staffSvcRes = await supabase
        .from('dp_staff_services')
        .select('staff_id')
        .eq('service_id', serviceId);

      const capableStaffIds = (staffSvcRes.data ?? []).map((r) => r.staff_id as string);

      if (capableStaffIds.length > 0) {
        // Filter out staff absent on this date
        const absenceRes = await supabase
          .from('dp_staff_absences')
          .select('staff_id')
          .in('staff_id', capableStaffIds)
          .eq('absence_date', date);
        const absentIds = new Set((absenceRes.data ?? []).map((r) => r.staff_id as string));
        const presentStaffIds = capableStaffIds.filter((id) => !absentIds.has(id));

        if (presentStaffIds.length === 0) return NextResponse.json({ slots: [], reason: 'staff_absent' });

        const schedRes = await supabase
          .from('dp_staff_schedule')
          .select('*')
          .in('staff_id', presentStaffIds)
          .eq('day_of_week', dow);

        const activeSchedules = (schedRes.data ?? []).filter((s) => s.is_active);

        if (activeSchedules.length === 0) return NextResponse.json({ slots: [], reason: 'no_schedule' });

        const staleThreshold = new Date(Date.now() - 35 * 60 * 1000).toISOString();
        const slotsByStaff: TimeSlot[][] = [];

        for (const sch of activeSchedules) {
          const apptRes = await supabase
            .from('dp_appointments')
            .select('start_time, end_time, status, created_at')
            .eq('appointment_date', date)
            .eq('staff_id', sch.staff_id)
            .neq('status', 'cancelled')
            .or(`status.neq.pending_payment,created_at.gt.${staleThreshold}`);

          // Also include null-staff appointments as blockers
          const nullApptRes = await supabase
            .from('dp_appointments')
            .select('start_time, end_time, status, created_at')
            .eq('appointment_date', date)
            .is('staff_id', null)
            .neq('status', 'cancelled')
            .or(`status.neq.pending_payment,created_at.gt.${staleThreshold}`);

          const appts: ApptRow[] = [
            ...(apptRes.data ?? []),
            ...(nullApptRes.data ?? []),
          ].map((a) => ({
            start_time: a.start_time as string,
            end_time:   a.end_time   as string,
            status:     a.status     as string,
          }));

          const staffSchedule: ScheduleConfig = {
            id:          sch.id,
            day_of_week: sch.day_of_week,
            is_active:   sch.is_active,
            start_time:  sch.start_time,
            end_time:    sch.end_time,
            break_start: sch.break_start ?? null,
            break_end:   sch.break_end   ?? null,
          };

          slotsByStaff.push(
            generateTimeSlots(staffSchedule, duration, activeMinutes, appts as never, blockedSlots as never)
          );
        }

        // Merge: slot is available if ANY staff has it free
        const merged = mergeStaffSlots(slotsByStaff);
        const reason = merged.length === 0 ? 'full' : merged.every((s) => !s.available) ? 'full' : undefined;
        return NextResponse.json({ slots: merged, ...(reason ? { reason } : {}) });
      }
    }

    // ── Global fallback (no staff configured for this service) ───
    const { data } = await supabase
      .from('dp_schedule')
      .select('*')
      .eq('day_of_week', dow)
      .maybeSingle();

    const globalSchedule: ScheduleConfig = data ?? (MOCK_SCHEDULE.find((s) => s.day_of_week === dow) as ScheduleConfig);
    if (!globalSchedule?.is_active) return NextResponse.json({ slots: [] });

    const staleThreshold = new Date(Date.now() - 35 * 60 * 1000).toISOString();
    const apptRes = await supabase
      .from('dp_appointments')
      .select('start_time, end_time, status, created_at')
      .eq('appointment_date', date)
      .neq('status', 'cancelled')
      .or(`status.neq.pending_payment,created_at.gt.${staleThreshold}`);

    const appointments: ApptRow[] = (apptRes.data ?? []).map((a) => ({
      start_time: a.start_time as string,
      end_time:   a.end_time   as string,
      status:     a.status     as string,
    }));

    return NextResponse.json({
      slots: generateTimeSlots(globalSchedule, duration, activeMinutes, appointments as never, blockedSlots as never),
    });
  }

  // ── Full mock fallback (no DB) ───────────────────────────────
  if (serviceId) {
    const slotsByStaff: TimeSlot[][] = [];
    for (const staff of MOCK_STAFF.filter((s) => s.is_active && s.service_ids.includes(serviceId))) {
      const sch = staff.schedule.find((d) => d.day_of_week === dow);
      if (!sch?.is_active) continue;
      slotsByStaff.push(generateTimeSlots(sch, duration, activeMinutes, [], []));
    }
    return NextResponse.json({ slots: mergeStaffSlots(slotsByStaff) });
  }

  const schedule = MOCK_SCHEDULE.find((s) => s.day_of_week === dow);
  if (!schedule?.is_active) return NextResponse.json({ slots: [] });
  return NextResponse.json({ slots: generateTimeSlots(schedule, duration, activeMinutes, [], []) });
}

function mergeStaffSlots(slotsByStaff: TimeSlot[][]): TimeSlot[] {
  if (slotsByStaff.length === 0) return [];
  const timeMap = new Map<string, { end: string; available: boolean }>();
  for (const slots of slotsByStaff) {
    for (const s of slots) {
      const existing = timeMap.get(s.start);
      if (!existing) {
        timeMap.set(s.start, { end: s.end, available: s.available });
      } else if (s.available) {
        timeMap.set(s.start, { end: s.end, available: true });
      }
    }
  }
  return [...timeMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([start, { end, available }]) => ({ start, end, available }));
}
