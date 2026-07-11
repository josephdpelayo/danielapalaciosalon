import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

// GET /api/admin/clients?search=&page=&pageSize=
// Server-side merge of dp_clients + dp_trusted_clients + visit counts from dp_appointments,
// with real pagination (replaces the fragile 3-way client-side merge in the old admin page).
export async function GET(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const search   = searchParams.get('search')?.trim() ?? '';
  const page     = Math.max(parseInt(searchParams.get('page') ?? '1', 10) || 1, 1);
  const pageSize = Math.max(parseInt(searchParams.get('pageSize') ?? '20', 10) || 20, 1);

  if (!(await import('@/lib/supabase')).supabaseReady) {
    return NextResponse.json({ clients: [], total: 0, page, pageSize });
  }

  const { supabaseAdmin: supabase } = await import('@/lib/supabase');

  const from = (page - 1) * pageSize;
  const to   = from + pageSize - 1;

  let query = supabase
    .from('dp_clients')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: true })
    .range(from, to);

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data: clientRows, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const [{ data: trustedRows, error: trustedError }, { data: apptRows, error: apptError }] = await Promise.all([
    supabase.from('dp_trusted_clients').select('phone_normalized, notes'),
    supabase.from('dp_appointments').select('client_phone, status').neq('status', 'cancelled'),
  ]);

  if (trustedError) return NextResponse.json({ error: trustedError.message }, { status: 500 });
  if (apptError) return NextResponse.json({ error: apptError.message }, { status: 500 });

  const trustedMap = new Map(
    (trustedRows ?? []).map((t: { phone_normalized: string; notes: string | null }) => [t.phone_normalized, t])
  );

  const visitCounts = new Map<string, number>();
  for (const a of (apptRows ?? []) as { client_phone: string }[]) {
    const norm = normalizePhone(a.client_phone);
    visitCounts.set(norm, (visitCounts.get(norm) ?? 0) + 1);
  }

  const clients = (clientRows ?? []).map((c: Record<string, unknown>) => {
    const phoneNormalized = c.phone_normalized as string;
    const trusted = trustedMap.get(phoneNormalized);
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      phone_normalized: phoneNormalized,
      email: c.email ?? null,
      created_at: c.created_at,
      is_trusted: !!trusted,
      trusted_notes: trusted?.notes ?? null,
      visit_count: visitCounts.get(phoneNormalized) ?? 0,
      loyalty_visits: c.loyalty_visits ?? 0,
      loyalty_token: c.loyalty_token ?? null,
    };
  });

  return NextResponse.json({ clients, total: count ?? 0, page, pageSize });
}
