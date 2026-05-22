import { NextRequest, NextResponse } from 'next/server';

export function requireAdmin(req: NextRequest): NextResponse | null {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'ADMIN_SECRET no configurado' }, { status: 500 });
  }
  const provided = req.headers.get('x-admin-secret');
  if (provided !== secret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  return null;
}
