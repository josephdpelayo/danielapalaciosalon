import { NextRequest, NextResponse } from 'next/server';
import { generateTimeSlots } from '@/lib/slots';
import { MOCK_SCHEDULE } from '@/lib/mock-data';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date          = searchParams.get('date');
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
    const { supabase } = await import('@/lib/supabase');

    // Fetch appointments — exclude only cancelled (pending_payment still holds the slot)
    const apptRes = await supabase
      .from('dp_appointments')
      .select('start_time, end_time, status')
      .eq('appointment_date', date)
      .neq('status', 'cancelled');

    if (apptRes.error) {
      console.error('available-slots appt error:', apptRes.error.message);
    } else {
      appointments = (apptRes.data ?? []).map((a) => ({
        start_time:     a.start_time as string,
        end_time:       a.end_time   as string,
        status:         a.status     as string,
        active_minutes: undefined,   // derived from end_time in generateTimeSlots
      }));
    }

    // Fetch blocked slots
    const blockRes = await supabase
      .from('dp_blocked_slots')
      .select('start_time, end_time, all_day')
      .eq('block_date', date);

    if (blockRes.error) {
      console.error('available-slots block error:', blockRes.error.message);
    } else {
      blockedSlots = blockRes.data ?? [];
    }
  }

  const slots = generateTimeSlots(
    schedule,
    duration,
    activeMinutes,
    appointments as never,
    blockedSlots as never
  );

  return NextResponse.json({ slots });
}
