import { NextRequest, NextResponse } from 'next/server';

// Normaliza a últimos 10 dígitos para comparar sin importar formato
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone') ?? '';
  if (phone.replace(/\D/g, '').length < 8) {
    return NextResponse.json({ trusted: false });
  }

  const normalized = normalizePhone(phone);

  if ((await import("@/lib/supabase")).supabaseReady) {
    const { supabase } = await import('@/lib/supabase');
    const { data } = await supabase
      .from('dp_trusted_clients')
      .select('id, name, notes')
      .eq('phone_normalized', normalized)
      .single();
    return NextResponse.json({ trusted: !!data, client: data ?? null });
  }

  // Mock: números que terminan en 0000 son clientes frecuentes
  const trusted = normalized.endsWith('0000');
  return NextResponse.json({
    trusted,
    client: trusted ? { id: 'mock', name: 'Cliente Frecuente', notes: null } : null,
  });
}
