import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { service_id, client_name, client_phone, client_email, appointment_date, start_time, end_time, notes, deposit_amount } = body;

  if (!service_id || !client_name || !client_phone || !appointment_date || !start_time || !end_time) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const hasMercadoPago = !!process.env.MERCADOPAGO_ACCESS_TOKEN;
  const initialStatus = hasMercadoPago ? 'pending_payment' : 'pending';

  if ((await import("@/lib/supabase")).supabaseReady) {
    const { supabase } = await import('@/lib/supabase');
    const { data, error } = await supabase.from('dp_appointments').insert({
      service_id,
      client_name,
      client_phone,
      client_email: client_email || null,
      appointment_date,
      start_time,
      end_time,
      notes: notes || null,
      deposit_amount: deposit_amount || null,
      status: initialStatus,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const mockId = 'mock-' + Date.now();
  return NextResponse.json({ id: mockId, status: initialStatus });
}

export async function GET() {
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
