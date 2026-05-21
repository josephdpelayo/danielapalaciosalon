import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { type, data } = body;
  if (type !== 'payment' || !data?.id) {
    return NextResponse.json({ ok: true });
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) return NextResponse.json({ ok: true });

  try {
    const client = new MercadoPagoConfig({ accessToken });
    const paymentClient = new Payment(client);
    const payment = await paymentClient.get({ id: data.id });

    const appointmentId = payment.external_reference;
    const paymentStatus = payment.status; // approved | pending | rejected | cancelled

    if (!appointmentId) return NextResponse.json({ ok: true });

    if ((await import("@/lib/supabase")).supabaseReady) {
      const { supabase } = await import('@/lib/supabase');

      const newStatus =
        paymentStatus === 'approved' ? 'confirmed' :
        paymentStatus === 'pending'  ? 'pending' :
        'pending_payment';

      await supabase
        .from('dp_appointments')
        .update({
          payment_id: String(payment.id),
          payment_status: paymentStatus,
          status: newStatus,
        })
        .eq('id', appointmentId);
    }
  } catch (err) {
    console.error('Webhook error:', err);
  }

  return NextResponse.json({ ok: true });
}
