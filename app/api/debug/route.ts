import { NextResponse } from 'next/server';

// GET /api/debug — muestra el estado real de las tablas de staff en Supabase
export async function GET() {
  if (!(await import('@/lib/supabase')).supabaseReady) {
    return NextResponse.json({ error: 'Supabase not configured' });
  }

  const { supabaseAdmin: supabase } = await import('@/lib/supabase');

  const [
    { data: staff, error: e1 },
    { data: schedule, error: e2 },
    { data: staffSched, error: e3 },
    { data: staffSvc, error: e4 },
    { data: absences, error: e5 },
    { data: services, error: e6 },
    { data: globalSched, error: e7 },
  ] = await Promise.all([
    supabase.from('dp_staff').select('id, name, is_active, phone'),
    supabase.from('dp_schedule').select('*'),
    supabase.from('dp_staff_schedule').select('*'),
    supabase.from('dp_staff_services').select('*'),
    supabase.from('dp_staff_absences').select('*'),
    supabase.from('dp_services').select('id, name'),
    supabase.from('dp_schedule').select('day_of_week, is_active'),
  ]);

  return NextResponse.json({
    dp_staff:          { data: staff,      error: e1?.message },
    dp_schedule:       { data: globalSched, error: e7?.message },
    dp_staff_schedule: { data: staffSched,  error: e3?.message },
    dp_staff_services: { data: staffSvc,    error: e4?.message },
    dp_staff_absences: { data: absences,    error: e5?.message },
    dp_services:       { data: services,    error: e6?.message },
  });
}
