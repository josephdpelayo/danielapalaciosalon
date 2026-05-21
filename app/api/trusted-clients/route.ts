import { NextRequest, NextResponse } from 'next/server';

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

export async function GET() {
  if (!(await import("@/lib/supabase")).supabaseReady) return NextResponse.json({ clients: [] });

  const { supabase } = await import('@/lib/supabase');
  const { data, error } = await supabase
    .from('dp_trusted_clients')
    .select('*')
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clients: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, phone, notes } = body;

  if (!name || !phone) return NextResponse.json({ error: 'Nombre y teléfono requeridos' }, { status: 400 });

  const normalized = normalizePhone(phone);

  if (!(await import("@/lib/supabase")).supabaseReady) {
    return NextResponse.json({ id: 'mock-' + Date.now(), name, phone, phone_normalized: normalized, notes });
  }

  const { supabase } = await import('@/lib/supabase');
  const { data, error } = await supabase
    .from('dp_trusted_clients')
    .insert({ name, phone, phone_normalized: normalized, notes: notes || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  if (!(await import("@/lib/supabase")).supabaseReady) return NextResponse.json({ ok: true });

  const { supabase } = await import('@/lib/supabase');
  const { error } = await supabase.from('dp_trusted_clients').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
