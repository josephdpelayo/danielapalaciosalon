import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

export async function GET(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  if (!(await import('@/lib/supabase')).supabaseReady) return NextResponse.json({ clients: [] });

  const { supabaseAdmin: supabase } = await import('@/lib/supabase');
  const { data, error } = await supabase
    .from('dp_trusted_clients')
    .select('*')
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clients: data });
}

export async function POST(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  const body = await req.json();
  const { name, phone, notes, email } = body;
  if (!name || !phone) return NextResponse.json({ error: 'Nombre y teléfono requeridos' }, { status: 400 });

  const normalized = normalizePhone(phone);
  const emailNorm = email ? email.trim().toLowerCase() : null;

  if (!(await import('@/lib/supabase')).supabaseReady) {
    return NextResponse.json({ id: 'mock-' + Date.now(), name, phone, phone_normalized: normalized, notes, email: emailNorm });
  }

  const { supabaseAdmin: supabase } = await import('@/lib/supabase');

  // Duplicate phone check
  const { data: dupPhone } = await supabase
    .from('dp_trusted_clients').select('name').eq('phone_normalized', normalized).maybeSingle();
  if (dupPhone) return NextResponse.json({ error: `El teléfono ya está registrado para ${dupPhone.name}` }, { status: 409 });

  // Duplicate email check
  if (emailNorm) {
    const { data: dupEmail } = await supabase
      .from('dp_trusted_clients').select('name').ilike('email', emailNorm).maybeSingle();
    if (dupEmail) return NextResponse.json({ error: `El correo ya está registrado para ${dupEmail.name}` }, { status: 409 });
  }

  // Try insert with email first; fall back without it if the column doesn't exist yet
  let result = await supabase
    .from('dp_trusted_clients')
    .insert({ name, phone, phone_normalized: normalized, notes: notes || null, email: email || null })
    .select()
    .single();

  if (result.error?.message?.includes('email')) {
    result = await supabase
      .from('dp_trusted_clients')
      .insert({ name, phone, phone_normalized: normalized, notes: notes || null })
      .select()
      .single();
  }

  const { data, error } = result;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  const body = await req.json();
  const { id, name, phone, email, notes } = body;
  if (!id || !name || !phone) return NextResponse.json({ error: 'id, nombre y teléfono requeridos' }, { status: 400 });

  const normalized = normalizePhone(phone);
  const emailNorm = email ? email.trim().toLowerCase() : null;

  if (!(await import('@/lib/supabase')).supabaseReady) {
    return NextResponse.json({ id, name, phone, phone_normalized: normalized, email: emailNorm, notes: notes || null });
  }

  const { supabaseAdmin: supabase } = await import('@/lib/supabase');

  // Duplicate phone check (excluding self)
  const { data: dupPhone } = await supabase
    .from('dp_trusted_clients').select('name').eq('phone_normalized', normalized).neq('id', id).maybeSingle();
  if (dupPhone) return NextResponse.json({ error: `El teléfono ya está registrado para ${dupPhone.name}` }, { status: 409 });

  // Duplicate email check (excluding self)
  if (emailNorm) {
    const { data: dupEmail } = await supabase
      .from('dp_trusted_clients').select('name').ilike('email', emailNorm).neq('id', id).maybeSingle();
    if (dupEmail) return NextResponse.json({ error: `El correo ya está registrado para ${dupEmail.name}` }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('dp_trusted_clients')
    .update({ name, phone, phone_normalized: normalized, email: emailNorm, notes: notes || null })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  if (!(await import('@/lib/supabase')).supabaseReady) return NextResponse.json({ ok: true });

  const { supabaseAdmin: supabase } = await import('@/lib/supabase');
  const { error } = await supabase.from('dp_trusted_clients').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
