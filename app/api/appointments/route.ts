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

    // Check for slot conflicts (guard against race conditions at app layer)
    const staleThreshold = new Date(Date.now() - PENDING_PAYMENT_TTL_MS).toISOString();
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
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Notify admin (fire-and-forget)
    import('@/lib/push').then(({ sendAdminPush }) =>
      sendAdminPush({
        title: '📅 Nueva reserva',
        body: `${client_name} · ${appointment_date} a las ${start_time.slice(0, 5)}`,
        url: '/admin',
        tag: 'new-booking',
      })
    ).catch(() => {});

    return NextResponse.json(data);
  }

  const mockId = 'mock-' + Date.now();
  return NextResponse.json({ id: mockId, status: initialStatus });
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
