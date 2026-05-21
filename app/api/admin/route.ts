import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, status, payment_status, payment_id } = body;

  if (!id || !status) return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });

  const updateFields: Record<string, string> = { status };
  if (payment_status) updateFields.payment_status = payment_status;
  if (payment_id) updateFields.payment_id = payment_id;

  if ((await import("@/lib/supabase")).supabaseReady) {
    const { supabase } = await import('@/lib/supabase');
    const { data, error } = await supabase
      .from('dp_appointments')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  return NextResponse.json({ id, status });
}
