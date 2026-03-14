import { NextRequest, NextResponse } from 'next/server';
import { touchOnlineSession } from '@/lib/db';

function normalizeSessionId(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 128);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const sessionId = normalizeSessionId(body?.sessionId);

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const online = await touchOnlineSession(sessionId, 5);
  return NextResponse.json({ online });
}
