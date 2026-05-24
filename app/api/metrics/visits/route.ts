import { NextRequest, NextResponse } from 'next/server';
import { getVisitCount, incrementVisitCount } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET() {
  const total = await getVisitCount();
  return NextResponse.json({ total });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = checkRateLimit(`visits:${ip}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const total = await incrementVisitCount();
  return NextResponse.json({ total });
}
