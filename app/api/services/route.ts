import { NextRequest, NextResponse } from 'next/server';
import { MOCK_SERVICES } from '@/lib/mock-data';

export async function GET() {
  if ((await import('@/lib/supabase')).supabaseReady) {
    const { supabase } = await import('@/lib/supabase');
    const { data, error } = await supabase
      .from('dp_services')
      .select('*')
      .eq('active', true)
      .order('sort_order');
    if (!error && data) {
      const mapped = data.map((s: Record<string, unknown>) => ({
        ...s,
        active_minutes: s.active_minutes ?? s.duration_minutes,
        deposit_amount: s.deposit_amount ?? 200,
      }));
      return NextResponse.json({ services: mapped });
    }
  }
  return NextResponse.json({ services: MOCK_SERVICES });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, price, duration_minutes, active_minutes, deposit_amount } = body;

  if (!name || !price || !duration_minutes || !active_minutes) {
    return NextResponse.json({ error: 'Campos requeridos: nombre, precio, duración, tiempo activo' }, { status: 400 });
  }
  if (!(await import('@/lib/supabase')).supabaseReady) {
    return NextResponse.json({ error: 'Supabase no disponible en modo demo' }, { status: 503 });
  }

  const { supabase } = await import('@/lib/supabase');
  const { data: maxRows } = await supabase
    .from('dp_services').select('sort_order').order('sort_order', { ascending: false }).limit(1);
  const nextOrder = ((maxRows?.[0] as Record<string, number> | null)?.sort_order ?? 0) + 1;

  const payload = {
    name, description: description || null,
    price: parseFloat(price),
    duration_minutes: parseInt(duration_minutes),
    active_minutes: parseInt(active_minutes),
    deposit_amount: parseFloat(deposit_amount) || 200,
    active: true,
    sort_order: nextOrder,
  };
  const { data, error } = await supabase
    .from('dp_services')
    .insert(payload)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data?.[0] ?? payload);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  if (!(await import('@/lib/supabase')).supabaseReady) {
    return NextResponse.json({ error: 'Supabase no disponible en modo demo' }, { status: 503 });
  }

  const { supabase } = await import('@/lib/supabase');
  const updates: Record<string, unknown> = {};
  if (fields.name        !== undefined) updates.name             = fields.name;
  if (fields.description !== undefined) updates.description      = fields.description || null;
  if (fields.price       !== undefined) updates.price            = parseFloat(fields.price);
  if (fields.duration_minutes !== undefined) updates.duration_minutes = parseInt(fields.duration_minutes);
  if (fields.active_minutes   !== undefined) updates.active_minutes   = parseInt(fields.active_minutes);
  if (fields.deposit_amount   !== undefined) updates.deposit_amount   = parseFloat(fields.deposit_amount);

  const { data, error } = await supabase
    .from('dp_services').update(updates).eq('id', id).select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data?.[0] ?? { id, ...updates });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  if (!(await import('@/lib/supabase')).supabaseReady) {
    return NextResponse.json({ error: 'Supabase no disponible en modo demo' }, { status: 503 });
  }

  const { supabase } = await import('@/lib/supabase');
  const { error } = await supabase.from('dp_services').update({ active: false }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
