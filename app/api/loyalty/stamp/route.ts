import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { updateLoyaltyPass } from '@/lib/passcreator';

export async function POST(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  const { phone, appointment_id, notes, stamped_by } = await req.json();
  if (!phone) return NextResponse.json({ error: 'phone requerido' }, { status: 400 });

  const phoneNorm = String(phone).replace(/\D/g, '').slice(-10);

  if (!(await import('@/lib/supabase')).supabaseReady) {
    return NextResponse.json({ error: 'DB no disponible' }, { status: 503 });
  }

  const { supabaseAdmin: supabase } = await import('@/lib/supabase');

  const { data: client, error: findErr } = await supabase
    .from('dp_clients')
    .select('*')
    .eq('phone_normalized', phoneNorm)
    .maybeSingle();

  if (findErr || !client) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
  }

  const c = client as Record<string, unknown>;
  const newCount = ((c.loyalty_visits as number) ?? 0) + 1;

  // Update visit count
  await supabase
    .from('dp_clients')
    .update({ loyalty_visits: newCount })
    .eq('phone_normalized', phoneNorm);

  // Log the visit
  await supabase.from('dp_loyalty_visits').insert({
    client_phone_norm: phoneNorm,
    appointment_id: appointment_id ?? null,
    notes: notes ?? null,
    stamped_by: stamped_by ?? 'admin',
  });

  // Push update to Apple/Google Wallet
  if (c.loyalty_pass_id) {
    await updateLoyaltyPass({
      passId:     c.loyalty_pass_id as string,
      name:       c.name as string,
      visitCount: newCount,
    });
  }

  return NextResponse.json({
    ok:          true,
    visit_count: newCount,
    pass_url:    c.loyalty_pass_url ?? null,
  });
}

// Admin can also remove a stamp (undo)
export async function DELETE(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  const { phone } = await req.json();
  if (!phone) return NextResponse.json({ error: 'phone requerido' }, { status: 400 });

  const phoneNorm = String(phone).replace(/\D/g, '').slice(-10);

  if (!(await import('@/lib/supabase')).supabaseReady) {
    return NextResponse.json({ error: 'DB no disponible' }, { status: 503 });
  }

  const { supabaseAdmin: supabase } = await import('@/lib/supabase');

  const { data: client } = await supabase
    .from('dp_clients')
    .select('*')
    .eq('phone_normalized', phoneNorm)
    .maybeSingle();

  if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

  const c = client as Record<string, unknown>;
  const newCount = Math.max(0, ((c.loyalty_visits as number) ?? 0) - 1);

  await supabase
    .from('dp_clients')
    .update({ loyalty_visits: newCount })
    .eq('phone_normalized', phoneNorm);

  if (c.loyalty_pass_id) {
    await updateLoyaltyPass({ passId: c.loyalty_pass_id as string, name: c.name as string, visitCount: newCount });
  }

  return NextResponse.json({ ok: true, visit_count: newCount });
}
