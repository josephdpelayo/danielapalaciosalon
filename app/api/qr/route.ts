import { NextRequest } from 'next/server';
import QRCode from 'qrcode';

export async function GET(req: NextRequest) {
  const data = new URL(req.url).searchParams.get('data') ?? '';
  if (!data) return new Response('Missing data', { status: 400 });

  const svg = await QRCode.toString(data, {
    type: 'svg',
    margin: 1,
    color: { dark: '#16181E', light: '#F0EDE8' },
  });

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
