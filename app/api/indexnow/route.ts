import { NextResponse } from 'next/server';
import { notifyIndexNow } from '@/lib/indexnow';

/**
 * POST /api/indexnow
 * Body: { urls: string[] }
 * Pings IndexNow (Bing, Yandex, etc.) to crawl the given URLs.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const urls: string[] = body?.urls || [];
    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'urls array required' }, { status: 400 });
    }

    const result = await notifyIndexNow(urls);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
