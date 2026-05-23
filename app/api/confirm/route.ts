import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

export function makeConfirmToken(appointmentId: string): string {
  const secret = process.env.CONFIRM_SECRET ?? process.env.CRON_SECRET ?? 'dev-secret';
  return createHmac('sha256', secret).update(appointmentId).digest('hex').slice(0, 24);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id    = searchParams.get('id');
  const token = searchParams.get('token');

  if (!id || !token) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
  }

  if (token !== makeConfirmToken(id)) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 403 });
  }

  if (!(await import('@/lib/supabase')).supabaseReady) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const { supabase } = await import('@/lib/supabase');

  const { data: apt, error } = await supabase
    .from('dp_appointments')
    .select('id, client_name, appointment_date, start_time, dp_services(name)')
    .eq('id', id)
    .single();

  if (error || !apt) {
    return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
  }

  await supabase
    .from('dp_appointments')
    .update({ status: 'confirmed' })
    .eq('id', id)
    .neq('status', 'cancelled');

  const { sendAdminPush } = await import('@/lib/push');
  await sendAdminPush({
    title: '✅ Cita confirmada por clienta',
    body: `${apt.client_name} confirmó su cita del ${apt.appointment_date} a las ${(apt.start_time as string)?.slice(0, 5)}`,
    tag: `confirm-${id}`,
  });

  return NextResponse.json({
    ok: true,
    client_name: apt.client_name,
    service: (apt.dp_services as unknown as { name: string } | null)?.name,
    date: apt.appointment_date,
    time: apt.start_time,
  });
}
