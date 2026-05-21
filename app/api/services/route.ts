import { NextResponse } from 'next/server';
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
