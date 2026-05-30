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
