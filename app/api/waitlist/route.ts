import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  if (!(await import('@/lib/supabase')).supabaseReady)
    return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const body = await req.json();
  const { service_id, preferred_date, client_name, client_phone, client_email, notes } = body;

  if (!client_name?.trim() || !client_phone?.trim())
    return NextResponse.json({ error: 'Name and phone required' }, { status: 400 });

  const { supabaseAdmin: supabase } = await import('@/lib/supabase');
  const { data, error } = await supabase
    .from('dp_waitlist')
    .insert({ service_id, preferred_date, client_name: client_name.trim(), client_phone: client_phone.trim(), client_email, notes })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data });
}

export async function GET(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  if (!(await import('@/lib/supabase')).supabaseReady) return NextResponse.json({ entries: [] });

  const { supabaseAdmin: supabase } = await import('@/lib/supabase');
  const status = req.nextUrl.searchParams.get('status') ?? 'waiting';

  const { data, error } = await supabase
    .from('dp_waitlist')
    .select('*, dp_services(name)')
    .eq('status', status)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  if (!(await import('@/lib/supabase')).supabaseReady)
    return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const { id, status } = await req.json();
  if (!id || !status) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const { supabaseAdmin: supabase } = await import('@/lib/supabase');
  const patch: Record<string, unknown> = { status };
  if (status === 'notified') patch.notified_at = new Date().toISOString();

  await supabase.from('dp_waitlist').update(patch).eq('id', id);
  return NextResponse.json({ ok: true });
}
