import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    appointment_id,
    service_name,
    deposit_amount,
    client_name,
    client_email,
    appointment_date,
    start_time,
  } = body;

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ error: 'MercadoPago not configured' }, { status: 503 });
  }

  const client = new MercadoPagoConfig({ accessToken });
  const preference = new Preference(client);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `https://${req.headers.get('host')}`;

  const result = await preference.create({
    body: {
      items: [
        {
          id: appointment_id,
          title: `Anticipo — ${service_name}`,
          description: `Cita: ${appointment_date} a las ${start_time}`,
          quantity: 1,
          unit_price: Number(deposit_amount),
          currency_id: 'MXN',
        },
      ],
      payer: {
        name: client_name,
        email: client_email || 'cliente@danielapalaciosalon.com',
      },
      external_reference: appointment_id,
      back_urls: {
        success: `${baseUrl}/reservar/exito?id=${appointment_id}`,
        failure: `${baseUrl}/reservar/cancelado?id=${appointment_id}`,
        pending: `${baseUrl}/reservar/exito?id=${appointment_id}&pending=1`,
      },
      auto_return: 'approved',
      notification_url: `${baseUrl}/api/payment/webhook`,
      statement_descriptor: 'DANIELA PALACIO',
      expires: true,
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    },
  });

  return NextResponse.json({ init_point: result.init_point, id: result.id });
}
