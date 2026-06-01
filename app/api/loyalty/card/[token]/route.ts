import { NextRequest, NextResponse } from 'next/server';
import { REWARD_AT } from '@/lib/passcreator';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 });

  if (!(await import('@/lib/supabase')).supabaseReady) {
    return NextResponse.json({ error: 'DB no disponible' }, { status: 503 });
  }

  const { supabaseAdmin: supabase } = await import('@/lib/supabase');

  const { data: client, error } = await supabase
    .from('dp_clients')
    .select('name, loyalty_visits, loyalty_pass_url, loyalty_token')
    .eq('loyalty_token', token)
    .maybeSingle();

  if (error || !client) {
    return NextResponse.json({ error: 'Tarjeta no encontrada' }, { status: 404 });
  }

  // Recent visit history
  const phoneRes = await supabase
    .from('dp_clients')
    .select('phone_normalized')
    .eq('loyalty_token', token)
    .maybeSingle();

  const phoneNorm = (phoneRes.data as Record<string, string> | null)?.phone_normalized;
  let visits: { created_at: string; notes: string | null; stamped_by: string }[] = [];

  if (phoneNorm) {
    const { data: hist } = await supabase
      .from('dp_loyalty_visits')
      .select('created_at, notes, stamped_by')
      .eq('client_phone_norm', phoneNorm)
      .order('created_at', { ascending: false })
      .limit(20);
    visits = (hist ?? []) as typeof visits;
  }

  const c = client as Record<string, unknown>;
  const visitCount = (c.loyalty_visits as number) ?? 0;
  const cycle = visitCount % REWARD_AT;

  return NextResponse.json({
    name:           c.name,
    visit_count:    visitCount,
    cycle_stamps:   cycle,
    reward_at:      REWARD_AT,
    rewards_earned: Math.floor(visitCount / REWARD_AT),
    pass_url:       c.loyalty_pass_url ?? null,
    visits,
  });
}
