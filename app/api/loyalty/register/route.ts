import { NextRequest, NextResponse } from 'next/server';
import { createLoyaltyPass } from '@/lib/passcreator';

export async function POST(req: NextRequest) {
  const { name, phone } = await req.json();
  if (!name?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: 'Nombre y teléfono requeridos' }, { status: 400 });
  }

  const phoneNorm = String(phone).replace(/\D/g, '').slice(-10);
  if (phoneNorm.length < 10) {
    return NextResponse.json({ error: 'Teléfono inválido (10 dígitos)' }, { status: 400 });
  }

  if (!(await import('@/lib/supabase')).supabaseReady) {
    return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
  }

  const { supabaseAdmin: supabase } = await import('@/lib/supabase');

  // Find or create client
  const { data: existing } = await supabase
    .from('dp_clients')
    .select('*')
    .eq('phone_normalized', phoneNorm)
    .maybeSingle();

  let client = existing as Record<string, unknown> | null;

  if (!client) {
    // Create new client
    const { data: created, error } = await supabase
      .from('dp_clients')
      .insert({
        name: name.trim(),
        phone: phone.trim(),
        phone_normalized: phoneNorm,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    client = created as Record<string, unknown>;
  }

  // Create Passcreator pass if not yet created
  if (!client.loyalty_pass_id) {
    const pass = await createLoyaltyPass({
      identifier: phoneNorm,
      name: client.name as string,
      visitCount: (client.loyalty_visits as number) ?? 0,
    });
    if (pass) {
      await supabase
        .from('dp_clients')
        .update({ loyalty_pass_id: pass.passId, loyalty_pass_url: pass.passUrl })
        .eq('phone_normalized', phoneNorm);
      client.loyalty_pass_id  = pass.passId;
      client.loyalty_pass_url = pass.passUrl;
    }
  }

  return NextResponse.json({
    token:         client.loyalty_token,
    visit_count:   client.loyalty_visits ?? 0,
    pass_url:      client.loyalty_pass_url ?? null,
    name:          client.name,
  });
}
