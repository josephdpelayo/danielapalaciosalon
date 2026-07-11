import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { makeConfirmToken } from '@/app/api/confirm/route';

const PENDING_PAYMENT_TTL_MS = 35 * 60 * 1000;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { service_id, client_name, client_phone, client_email, appointment_date, start_time, end_time, notes, deposit_amount, active_minutes } = body;

  if (!service_id || !client_name || !client_phone || !appointment_date || !start_time || !end_time) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const hasMercadoPago = !!process.env.MERCADOPAGO_ACCESS_TOKEN;
  const initialStatus = hasMercadoPago ? 'pending_payment' : 'pending';

  // Validate appointment date is in the future
  const apptDateTime = new Date(appointment_date + 'T' + start_time);
  if (apptDateTime < new Date()) {
    return NextResponse.json({ error: 'La fecha de la cita debe ser en el futuro.' }, { status: 400 });
  }

  if ((await import("@/lib/supabase")).supabaseReady) {
    const { supabaseAdmin: supabase } = await import('@/lib/supabase');
    const staleThreshold = new Date(Date.now() - PENDING_PAYMENT_TTL_MS).toISOString();
    const phoneNorm = client_phone.replace(/\D/g, '').slice(-10);

    // ── Multi-staff: find first available staff for this service ──
    let assignedStaffId: string | null = null;

    const { data: capableStaff } = await supabase
      .from('dp_staff_services')
      .select('staff_id, dp_staff!inner(is_active)')
      .eq('service_id', service_id);

    const activeCapable = (capableStaff ?? []).filter(
      (r) => (r.dp_staff as unknown as { is_active: boolean })?.is_active
    );

    if (activeCapable.length > 0) {
      for (const { staff_id } of activeCapable) {
        const { data: conflicts } = await supabase
          .from('dp_appointments')
          .select('id')
          .eq('appointment_date', appointment_date)
          .eq('staff_id', staff_id)
          .neq('status', 'cancelled')
          .or(`status.neq.pending_payment,created_at.gt.${staleThreshold}`)
          .lt('start_time', end_time)
          .gt('end_time', start_time)
          .limit(1);

        if (!conflicts || conflicts.length === 0) {
          assignedStaffId = staff_id;
          break;
        }
      }

      if (!assignedStaffId) {
        return NextResponse.json({ error: 'El horario ya no está disponible. Por favor elige otro.' }, { status: 409 });
      }
    } else {
      // No staff system configured — global conflict check
      const { data: conflicts } = await supabase
        .from('dp_appointments')
        .select('id')
        .eq('appointment_date', appointment_date)
        .neq('status', 'cancelled')
        .or(`status.neq.pending_payment,created_at.gt.${staleThreshold}`)
        .lt('start_time', end_time)
        .gt('end_time', start_time)
        .limit(1);

      if (conflicts && conflicts.length > 0) {
        return NextResponse.json({ error: 'El horario ya no está disponible. Por favor elige otro.' }, { status: 409 });
      }
    }

    const { data, error } = await supabase.from('dp_appointments').insert({
      service_id,
      client_name,
      client_phone,
      client_email: client_email || null,
      appointment_date,
      start_time,
      end_time,
      active_minutes: active_minutes || null,
      notes: notes || null,
      deposit_amount: deposit_amount || null,
      status: initialStatus,
      staff_id: assignedStaffId,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const confirm_token = makeConfirmToken(data.id);

    // ── Auto-register / update client record ──
    try {
      await supabase.from('dp_clients').upsert({
        name: client_name,
        phone: client_phone,
        phone_normalized: phoneNorm,
        email: client_email || null,
      }, { onConflict: 'phone_normalized' });
    } catch { /* table may not exist yet — safe to ignore */ }

    // Notify admin — await before returning so Vercel doesn't kill the function first
    try {
      const { sendAdminPush } = await import('@/lib/push');
      await sendAdminPush({
        title: '📅 Nueva reserva',
        body: `${client_name} · ${appointment_date} a las ${start_time.slice(0, 5)}`,
        url: '/admin',
        tag: 'new-booking',
      });
    } catch {}

    return NextResponse.json({ ...data, confirm_token });
  }

  const mockId = 'mock-' + Date.now();
  return NextResponse.json({ id: mockId, status: initialStatus });
}

export async function PATCH(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  const body = await req.json();
  const { id, appointment_date, start_time, end_time, notes, service_id, reminder_sent_at } = body;

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  if (!(await import('@/lib/supabase')).supabaseReady) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { supabase } = await import('@/lib/supabase');

  // Fetch the existing appointment to know its staff_id and current values
  const { data: existing, error: fetchError } = await supabase
    .from('dp_appointments')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
  }

  const newDate      = appointment_date ?? existing.appointment_date;
  const newStart     = start_time       ?? existing.start_time;
  const newEnd       = end_time         ?? existing.end_time;
  const newServiceId = service_id       ?? existing.service_id;
  const newNotes     = notes !== undefined ? notes : existing.notes;

  if (!newStart || !newEnd || !newDate) {
    return NextResponse.json({ error: 'Missing required time fields' }, { status: 400 });
  }

  const staleThreshold = new Date(Date.now() - PENDING_PAYMENT_TTL_MS).toISOString();

  // Conflict check: same logic as POST, but excluding this appointment's own id
  if (existing.staff_id) {
    const { data: conflicts } = await supabase
      .from('dp_appointments')
      .select('id')
      .eq('appointment_date', newDate)
      .eq('staff_id', existing.staff_id)
      .neq('status', 'cancelled')
      .neq('id', id)
      .or(`status.neq.pending_payment,created_at.gt.${staleThreshold}`)
      .lt('start_time', newEnd)
      .gt('end_time', newStart)
      .limit(1);

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json({ error: 'El horario ya no está disponible. Por favor elige otro.' }, { status: 409 });
    }
  } else {
    // Global conflict check (no staff assigned)
    const { data: conflicts } = await supabase
      .from('dp_appointments')
      .select('id')
      .eq('appointment_date', newDate)
      .neq('status', 'cancelled')
      .neq('id', id)
      .or(`status.neq.pending_payment,created_at.gt.${staleThreshold}`)
      .lt('start_time', newEnd)
      .gt('end_time', newStart)
      .limit(1);

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json({ error: 'El horario ya no está disponible. Por favor elige otro.' }, { status: 409 });
    }
  }

  const updatePayload: Record<string, unknown> = {
    appointment_date: newDate,
    start_time:       newStart,
    end_time:         newEnd,
    notes:            newNotes,
    service_id:       newServiceId,
  };

  if (reminder_sent_at !== undefined) updatePayload.reminder_sent_at = reminder_sent_at;

  const { data, error } = await supabase
    .from('dp_appointments')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  const body = await req.json();
  const { id, phone_normalized } = body;

  if (!id && !phone_normalized) {
    return NextResponse.json({ error: 'Missing id or phone_normalized' }, { status: 400 });
  }

  if (!(await import('@/lib/supabase')).supabaseReady) return NextResponse.json({ ok: true, deleted: 0 });

  const { supabase } = await import('@/lib/supabase');

  // Single appointment delete by id
  if (id) {
    const { error } = await supabase.from('dp_appointments').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Bulk delete by normalized phone (backward-compatible client flow)
  const { data: appts } = await supabase.from('dp_appointments').select('id, client_phone');
  if (!appts) return NextResponse.json({ ok: true, deleted: 0 });

  const toDelete = appts
    .filter(a => a.client_phone.replace(/\D/g, '').slice(-10) === phone_normalized)
    .map(a => a.id);

  if (toDelete.length > 0) {
    await supabase.from('dp_appointments').delete().in('id', toDelete);
  }

  return NextResponse.json({ ok: true, deleted: toDelete.length });
}

export async function GET(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  if (!(await import("@/lib/supabase")).supabaseReady) {
    return NextResponse.json({ appointments: [] });
  }
  const { supabase } = await import('@/lib/supabase');
  const { data, error } = await supabase
    .from('dp_appointments')
    .select('*, staff_id, dp_services(name, duration_minutes)')
    .order('appointment_date', { ascending: true })
    .order('start_time', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ appointments: data });
}
