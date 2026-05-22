import { NextRequest, NextResponse } from 'next/server';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

export async function GET(req: NextRequest) {
  // Protect with CRON_SECRET (set in env vars)
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('x-cron-secret') !== secret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (!(await import('@/lib/supabase')).supabaseReady) {
    return NextResponse.json({ reminders: [] });
  }

  const { supabase } = await import('@/lib/supabase');
  const tomorrow    = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const tomorrowESStr = format(addDays(new Date(), 1), "EEEE d 'de' MMMM", { locale: es });

  const [apptRes, settingsRes] = await Promise.all([
    supabase
      .from('dp_appointments')
      .select('id, client_name, client_phone, start_time, end_time, dp_services(name)')
      .eq('appointment_date', tomorrow)
      .eq('status', 'confirmed'),
    supabase
      .from('dp_settings')
      .select('key, value')
      .in('key', ['msg_reminder_24h', 'whatsapp']),
  ]);

  const settingsMap = Object.fromEntries(
    (settingsRes.data ?? []).map((r: { key: string; value: string }) => [r.key, r.value])
  );
  const template = settingsMap.msg_reminder_24h
    ?? 'Hola {nombre} 👋 Te recuerdo que mañana tienes cita para *{servicio}* a las *{hora}* ✨ ¿Confirmas? Sí ✅ o No ❌';

  const reminders = (apptRes.data ?? []).map((apt) => {
    const service  = (apt.dp_services as unknown as { name: string } | null)?.name ?? 'tu servicio';
    const hora     = apt.start_time?.slice(0, 5) ?? '';
    const message  = template
      .replace(/\{nombre\}/g, apt.client_name as string)
      .replace(/\{servicio\}/g, service)
      .replace(/\{fecha\}/g, tomorrowESStr)
      .replace(/\{hora\}/g, hora);
    const phone    = (apt.client_phone as string).replace(/\D/g, '');
    const waLink   = `https://wa.me/${phone.length >= 12 ? phone : `52${phone.slice(-10)}`}?text=${encodeURIComponent(message)}`;
    return {
      id:           apt.id,
      client_name:  apt.client_name,
      client_phone: apt.client_phone,
      service,
      start_time:   apt.start_time,
      message,
      wa_link:      waLink,
    };
  });

  return NextResponse.json({
    date:      tomorrow,
    count:     reminders.length,
    reminders,
  });
}
