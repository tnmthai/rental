import { NextRequest, NextResponse } from 'next/server';
import { searchListings } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

function parseNeed(msg: string) {
  const lower = msg.toLowerCase();
  const city = lower.includes('auckland')
    ? 'Auckland'
    : lower.includes('christchurch')
      ? 'Christchurch'
      : lower.includes('wellington')
        ? 'Wellington'
        : lower.includes('lincoln')
          ? 'Lincoln'
          : undefined;

  const m = lower.match(/(\d{2,4})\s*(nzd|\$)?\/?\s*(week|wk|tuần)?/);
  const maxPrice = m ? Number(m[1]) : undefined;

  const furnished = /(furnished|full furnished|đầy đủ nội thất|nội thất)/.test(lower) ? true : undefined;
  const billsIncluded = /(bills included|include bills|bao bill|bao điện nước|đã gồm hóa đơn)/.test(lower)
    ? true
    : undefined;

  const nearSchool = lower.includes('aut')
    ? 'AUT'
    : lower.includes('uoa') || lower.includes('auckland university')
      ? 'UoA'
      : lower.includes('lu') || lower.includes('lincoln university')
        ? 'LU'
        : undefined;

  const suburb = lower.includes('lincoln') ? 'lincoln' : undefined;

  return { city, suburb, maxPrice, furnished, billsIncluded, nearSchool };
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`chat:${ip}`, 30, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a bit and retry.' },
        { status: 429, headers: { 'Retry-After': Math.ceil((rl.resetAt - Date.now()) / 1000).toString() } }
      );
    }

    const { message } = await req.json();
    const need = parseNeed(String(message || ''));
    const results = await searchListings(need);

    const detailBits: string[] = [];
    if (need.city) detailBits.push(`in ${need.city}`);
    if (need.maxPrice) detailBits.push(`under ${need.maxPrice} NZD/week`);
    if (need.suburb) detailBits.push(`around ${need.suburb}`);
    if (need.furnished) detailBits.push('furnished');
    if (need.billsIncluded) detailBits.push('bills included');
    if (need.nearSchool) detailBits.push(`near ${need.nearSchool}`);

    const reply = results.length
      ? `Found ${results.length} matching options${detailBits.length ? ` (${detailBits.join(', ')})` : ''}.`
      : 'No matching listings yet. Try increasing budget, expanding location, or removing one filter.';

    return NextResponse.json({ reply, filters: need, results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
