import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  const err = requireAdmin(req);
  if (err) return err;
  return NextResponse.json({ ok: true });
}
