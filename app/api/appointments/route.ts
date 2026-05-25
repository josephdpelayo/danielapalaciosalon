import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

const PENDING_PAYMENT_TTL_MS = 35 * 60 * 1000;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { service_id, client_name, client_phone, client_email, appointment_date, start_time, end_time, notes, deposit_amount, active_minutes } = body;

  if (!service_id || !client_name || !client_phone || !appointment_date || !start_time || !end_time) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const hasMercadoPago = !!process.env.MERCADOPAGO_ACCESS_TOKEN;
  const initialStatus = hasMercadoPago ? 'pending_payment' : 'pending';

  if ((await import("@/lib/supabase")).supabaseReady) {
    const { supabase } = await import('@/lib/supabase');
    const staleThreshold = new Date(Date.now() - PENDING_PAYMENT_TTL_MS).toISOString();
    const today = new Date().toISOString().slice(0, 10);

    // ── Duplicate client check: block if already has a future active appointment ──
    const phoneNorm = client_phone.replace(/\D/g, '').slice(-10);
    const { data: allAppts } = await supabase
      .from('dp_appointments')
      .select('client_phone, client_email, appointment_date, start_time')
      .neq('status', 'cancelled')
      .gte('appointment_date', today);

    const existing = (allAppts ?? []).find(a => {
      const norm = a.client_phone.replace(/\D/g, '').slice(-10);
      if (norm === phoneNorm) return true;
      if (client_email && a.client_email &&
          a.client_email.trim().toLowerCase() === client_email.trim().toLowerCase()) return true;
      return false;
    });

    if (existing) {
      const when = `${existing.appointment_date} a las ${existing.start_time.slice(0, 5)}`;
      return NextResponse.json(
        { error: `Ya tienes una cita agendada para el ${when}. Escríbenos por WhatsApp si necesitas modificarla.` },
        { status: 409 }
      );
    }

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

    return NextResponse.json(data);
  }

  const mockId = 'mock-' + Date.now();
  return NextResponse.json({ id: mockId, status: initialStatus });
}

export async function DELETE(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  const { phone } = await req.json();
  if (!phone) return NextResponse.json({ error: 'Missing phone' }, { status: 400 });

  const normalized = phone.replace(/\D/g, '').slice(-10);
  if (!(await import('@/lib/supabase')).supabaseReady) return NextResponse.json({ ok: true, deleted: 0 });

  const { supabase } = await import('@/lib/supabase');
  const { data: appts } = await supabase.from('dp_appointments').select('id, client_phone');
  if (!appts) return NextResponse.json({ ok: true, deleted: 0 });

  const toDelete = appts
    .filter(a => a.client_phone.replace(/\D/g, '').slice(-10) === normalized)
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
    .select('*, dp_services(name, duration_minutes)')
    .order('appointment_date', { ascending: true })
    .order('start_time', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ appointments: data });
}
