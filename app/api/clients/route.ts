import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  if (!(await import('@/lib/supabase')).supabaseReady) {
    return NextResponse.json({ clients: [] });
  }

  const { supabase } = await import('@/lib/supabase');
  const { data, error } = await supabase
    .from('dp_clients')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clients: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  const body = await req.json();
  const { phone_normalized, name, email, phone } = body;

  if (!phone_normalized) return NextResponse.json({ error: 'phone_normalized requerido' }, { status: 400 });

  if (phone !== undefined) {
    return NextResponse.json(
      { error: 'El teléfono no se puede editar: es la clave usada por citas, lealtad y clientes de confianza' },
      { status: 400 }
    );
  }

  if (!(await import('@/lib/supabase')).supabaseReady) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  }

  const { supabaseAdmin: supabase } = await import('@/lib/supabase');

  const patch: Record<string, unknown> = {};
  if (name  !== undefined) patch.name  = name;
  if (email !== undefined) patch.email = email;

  const { data, error } = await supabase
    .from('dp_clients')
    .update(patch)
    .eq('phone_normalized', phone_normalized)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ client: data });
}

export async function DELETE(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  const { phone_normalized } = await req.json();
  if (!phone_normalized) return NextResponse.json({ error: 'phone_normalized requerido' }, { status: 400 });

  if (!(await import('@/lib/supabase')).supabaseReady) {
    return NextResponse.json({ ok: true });
  }

  const { supabase } = await import('@/lib/supabase');
  await supabase.from('dp_clients').delete().eq('phone_normalized', phone_normalized);
  return NextResponse.json({ ok: true });
}
