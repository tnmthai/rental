import { NextRequest, NextResponse } from 'next/server';
import { touchOnlineSession } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

function normalizeSessionId(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 128);
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = checkRateLimit(`online:${ip}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const sessionId = normalizeSessionId(body?.sessionId);

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const online = await touchOnlineSession(sessionId, 5);
  return NextResponse.json({ online });
}
