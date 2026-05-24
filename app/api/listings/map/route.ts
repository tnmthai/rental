import { NextRequest, NextResponse } from 'next/server';
import { getListingsWithCoords } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = checkRateLimit(`map:${ip}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const items = await getListingsWithCoords();
  return NextResponse.json({ items });
}
