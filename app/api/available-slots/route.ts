import { NextRequest, NextResponse } from 'next/server';
import { generateTimeSlots } from '@/lib/slots';
import { MOCK_SERVICES, MOCK_SCHEDULE } from '@/lib/mock-data';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date          = searchParams.get('date');
  const serviceId     = searchParams.get('service_id');
  const duration      = parseInt(searchParams.get('duration')      ?? '60');
  const activeMinutes = parseInt(searchParams.get('active_minutes') ?? String(duration));

  if (!date) return NextResponse.json({ error: 'Missing date' }, { status: 400 });

  const dow      = new Date(date + 'T12:00:00').getDay();
  const schedule = MOCK_SCHEDULE.find((s) => s.day_of_week === dow);

  if (!schedule || !schedule.is_active) return NextResponse.json({ slots: [] });

  type ApptRow = { start_time: string; end_time: string; status: string; active_minutes?: number };
  let appointments: ApptRow[] = [];
  let blockedSlots: Array<{ start_time: string | null; end_time: string | null; all_day: boolean }> = [];

  if ((await import("@/lib/supabase")).supabaseReady) {
    try {
      const { supabase } = await import('@/lib/supabase');
      const [apptRes, blockRes] = await Promise.all([
        supabase
          .from('dp_appointments')
          .select('start_time, end_time, status, active_minutes, dp_services(active_minutes)')
          .eq('appointment_date', date)
          .neq('status', 'cancelled')
          .neq('status', 'pending_payment'),
        supabase
          .from('dp_blocked_slots')
          .select('start_time, end_time, all_day')
          .eq('block_date', date),
      ]);

      appointments = (apptRes.data ?? []).map((a: {
        start_time: string;
        end_time: string;
        status: string;
        active_minutes?: number;
        dp_services?: { active_minutes?: number } | null;
      }) => ({
        start_time:    a.start_time,
        end_time:      a.end_time,
        status:        a.status,
        active_minutes: a.active_minutes ?? a.dp_services?.active_minutes,
      }));

      blockedSlots = blockRes.data ?? [];
    } catch { /* fall through to mock */ }
  }

  // Resolve active_minutes for the requested service from mock if needed
  let resolvedActive = activeMinutes;
  if (serviceId && !searchParams.get('active_minutes')) {
    const svc = MOCK_SERVICES.find((s) => s.id === serviceId);
    if (svc) resolvedActive = svc.active_minutes;
  }

  const slots = generateTimeSlots(
    schedule,
    duration,
    resolvedActive,
    appointments as never,
    blockedSlots as never
  );

  return NextResponse.json({ slots });
}
