import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

const PENDING_PAYMENT_TTL_MS = 35 * 60 * 1000;

// POST /api/waitlist/promote
// Body: { id, appointment_date, start_time, end_time, staff_id? }
// Turns a dp_waitlist entry into a real, admin-confirmed dp_appointments row.
export async function POST(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  const body = await req.json();
  const { id, appointment_date, start_time, end_time, staff_id } = body;

  if (!id || !appointment_date || !start_time || !end_time) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!(await import('@/lib/supabase')).supabaseReady) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  }

  const { supabaseAdmin: supabase } = await import('@/lib/supabase');

  const { data: waitlistRow, error: fetchError } = await supabase
    .from('dp_waitlist')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !waitlistRow) {
    return NextResponse.json({ error: 'Entrada de lista de espera no encontrada' }, { status: 404 });
  }

  const staleThreshold = new Date(Date.now() - PENDING_PAYMENT_TTL_MS).toISOString();

  // Conflict check — same pattern as POST /api/appointments, scoped to staff_id when provided
  let conflictQuery = supabase
    .from('dp_appointments')
    .select('id')
    .eq('appointment_date', appointment_date)
    .neq('status', 'cancelled')
    .or(`status.neq.pending_payment,created_at.gt.${staleThreshold}`)
    .lt('start_time', end_time)
    .gt('end_time', start_time);

  if (staff_id) conflictQuery = conflictQuery.eq('staff_id', staff_id);

  const { data: conflicts, error: conflictError } = await conflictQuery.limit(1);

  if (conflictError) return NextResponse.json({ error: conflictError.message }, { status: 500 });

  if (conflicts && conflicts.length > 0) {
    return NextResponse.json({ error: 'El horario ya no está disponible. Por favor elige otro.' }, { status: 409 });
  }

  const { data: appointment, error: insertError } = await supabase
    .from('dp_appointments')
    .insert({
      service_id:   waitlistRow.service_id,
      client_name:  waitlistRow.client_name,
      client_phone: waitlistRow.client_phone,
      client_email: waitlistRow.client_email ?? null,
      notes:        waitlistRow.notes ?? null,
      appointment_date,
      start_time,
      end_time,
      staff_id: staff_id ?? null,
      status: 'confirmed',
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // ── Auto-register / update client record (same upsert as POST /api/appointments) ──
  const phoneNorm = waitlistRow.client_phone.replace(/\D/g, '').slice(-10);
  try {
    await supabase.from('dp_clients').upsert({
      name: waitlistRow.client_name,
      phone: waitlistRow.client_phone,
      phone_normalized: phoneNorm,
      email: waitlistRow.client_email || null,
    }, { onConflict: 'phone_normalized' });
  } catch { /* table may not exist yet — safe to ignore */ }

  // ── Mark waitlist entry as booked ──
  await supabase
    .from('dp_waitlist')
    .update({ status: 'booked', notified_at: new Date().toISOString() })
    .eq('id', id);

  return NextResponse.json(appointment);
}
