import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  if (!(await import('@/lib/supabase')).supabaseReady) {
    return NextResponse.json({ stats: null });
  }

  const { supabase } = await import('@/lib/supabase');

  // Current month bounds
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

  const [monthRes, totalRes, weekRes] = await Promise.all([
    // Confirmed this month with deposit
    supabase
      .from('dp_appointments')
      .select('deposit_amount, dp_services(name)')
      .eq('status', 'confirmed')
      .gte('appointment_date', monthStart)
      .lt('appointment_date', monthEnd),
    // All confirmed ever
    supabase
      .from('dp_appointments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'confirmed'),
    // This week (next 7 days)
    supabase
      .from('dp_appointments')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'cancelled')
      .gte('appointment_date', now.toISOString().slice(0, 10))
      .lte('appointment_date', new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)),
  ]);

  const monthConfirmed = monthRes.data ?? [];
  const monthRevenue = monthConfirmed.reduce((sum, a) => sum + (a.deposit_amount ?? 0), 0);
  const monthCount = monthConfirmed.length;

  // Top service this month
  const svcCounts: Record<string, number> = {};
  for (const a of monthConfirmed) {
    const name = (a.dp_services as unknown as { name: string } | null)?.name ?? 'Otro';
    svcCounts[name] = (svcCounts[name] ?? 0) + 1;
  }
  const topService = Object.entries(svcCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return NextResponse.json({
    stats: {
      month_revenue: monthRevenue,
      month_confirmed: monthCount,
      total_confirmed: totalRes.count ?? 0,
      week_upcoming: weekRes.count ?? 0,
      top_service: topService,
    },
  });
}
