import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  const staffId = req.nextUrl.searchParams.get('staff_id');
  if (!staffId) return NextResponse.json({ error: 'Missing staff_id' }, { status: 400 });

  if (!(await import('@/lib/supabase')).supabaseReady) return NextResponse.json({ absences: [] });

  const { supabaseAdmin: supabase } = await import('@/lib/supabase');
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('dp_staff_absences')
    .select('id, absence_date')
    .eq('staff_id', staffId)
    .gte('absence_date', today)
    .order('absence_date', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ absences: data ?? [] });
}

export async function POST(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  if (!(await import('@/lib/supabase')).supabaseReady)
    return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const { staff_id, absence_date } = await req.json();
  if (!staff_id || !absence_date) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const { supabaseAdmin: supabase } = await import('@/lib/supabase');

  // Check for existing appointments on this day before marking as absent
  const { data: conflicting, error: conflictError } = await supabase
    .from('dp_appointments')
    .select('id')
    .eq('staff_id', staff_id)
    .eq('appointment_date', absence_date)
    .in('status', ['confirmed', 'pending']);

  if (conflictError) return NextResponse.json({ error: conflictError.message }, { status: 500 });

  if (conflicting && conflicting.length > 0) {
    const count = conflicting.length;
    return NextResponse.json(
      {
        conflict: true,
        count,
        error: `Este staff tiene ${count} cita(s) confirmadas ese día. Cancélalas primero o procede con precaución.`,
      },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from('dp_staff_absences')
    .insert({ staff_id, absence_date })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ absence: data });
}

export async function DELETE(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  if (!(await import('@/lib/supabase')).supabaseReady)
    return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const { staff_id, absence_date } = await req.json();
  if (!staff_id || !absence_date) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const { supabaseAdmin: supabase } = await import('@/lib/supabase');
  await supabase.from('dp_staff_absences').delete().eq('staff_id', staff_id).eq('absence_date', absence_date);
  return NextResponse.json({ ok: true });
}
