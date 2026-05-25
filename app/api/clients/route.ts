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
