import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export async function PATCH(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  const body = await req.json();
  const { id, status, payment_status, payment_id } = body;

  if (!id || !status) return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });

  const updateFields: Record<string, unknown> = { status };
  if (payment_status) updateFields.payment_status = payment_status;
  if (payment_id)     updateFields.payment_id     = payment_id;

  if ((await import('@/lib/supabase')).supabaseReady) {
    const { supabaseAdmin: supabase } = await import('@/lib/supabase');
    const { data, error } = await supabase
      .from('dp_appointments')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (status === 'cancelled') {
      import('@/lib/push').then(({ sendAdminPush }) =>
        sendAdminPush({
          title: '❌ Cita cancelada',
          body: `${data.client_name} · ${data.appointment_date} ${data.start_time?.slice(0, 5) ?? ''}`,
          url: '/admin',
          tag: 'cancellation',
        })
      ).catch(() => {});
    }

    return NextResponse.json(data);
  }

  return NextResponse.json({ id, status });
}
