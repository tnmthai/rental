import { NextRequest, NextResponse } from 'next/server';
import { createListing, listRecentListings } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET() {
  try {
    const items = await listRecentListings(50);
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`post-listing:${ip}`, 8, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many listing submissions. Please retry later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const title = String(body.title || '').trim();
    const city = String(body.city || '').trim();
    const source_url = String(body.source_url || '').trim();
    const price_nzd_week = Number(body.price_nzd_week || 0);

    if (!title || !city || !source_url || !price_nzd_week) {
      return NextResponse.json(
        { error: 'title, city, source_url, price_nzd_week are required' },
        { status: 400 }
      );
    }

    const imageUrlsFromArray = Array.isArray(body.image_urls)
      ? body.image_urls.map((x: unknown) => String(x).trim()).filter(Boolean)
      : [];
    const imageUrlsFromText = typeof body.image_urls_text === 'string'
      ? body.image_urls_text
          .split(/\r?\n|,/) 
          .map((x: string) => x.trim())
          .filter(Boolean)
      : [];
    const imageUrlSingle = typeof body.image_url === 'string' && body.image_url.trim() ? [body.image_url.trim()] : [];

    const created = await createListing({
      title,
      city,
      source_url,
      price_nzd_week,
      image_urls: [...imageUrlsFromArray, ...imageUrlsFromText, ...imageUrlSingle],
      description: body.description ? String(body.description).trim() : null,
      furnished: Boolean(body.furnished),
      bills_included: Boolean(body.bills_included),
      near_school: body.near_school ? String(body.near_school).trim() : null
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
