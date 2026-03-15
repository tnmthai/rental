import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createListing, findUserByEmail, listRecentListings, trackEvent } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

const NZ_COORDS: Record<string, [number, number]> = {
  auckland: [-36.8485, 174.7633],
  wellington: [-41.2866, 174.7756],
  christchurch: [-43.5321, 172.6362],
  hamilton: [-37.787, 175.2793],
  dunedin: [-45.8788, 170.5028],
  nelson: [-41.2706, 173.284],
  lincoln: [-43.6458, 172.4704],
  canterbury: [-43.5, 171.5],
  selwyn: [-43.65, 172.25],
  palmerston_north: [-40.3564, 175.6111],
  tauranga: [-37.6878, 176.1651],
  rotorua: [-38.1368, 176.2497],
  napier: [-39.4928, 176.912],
  hastings: [-39.6381, 176.8495],
  new_plymouth: [-39.0556, 174.0752],
  whangarei: [-35.7251, 174.3237],
  invercargill: [-46.4132, 168.3538],
  queenstown: [-45.0312, 168.6626]
};

function normalizePlaceKey(s?: string | null): string | null {
  if (!s) return null;
  const t = s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t || null;
}

function inferCoordsFromCity(city: string): [number, number] | null {
  const normalized = normalizePlaceKey(city);
  if (!normalized) return null;

  const parts = normalized.split(',').map((x) => x.trim()).filter(Boolean);
  const candidates = parts.length ? [...parts].reverse() : [normalized];

  for (const c of candidates) {
    if (NZ_COORDS[c]) return NZ_COORDS[c];
    const words = c.split(/\s+/).filter(Boolean);
    for (let i = 0; i < words.length; i++) {
      if (NZ_COORDS[words[i]]) return NZ_COORDS[words[i]];
      if (i < words.length - 1) {
        const two = `${words[i]}_${words[i + 1]}`;
        if (NZ_COORDS[two]) return NZ_COORDS[two];
      }
    }
  }

  return null;
}

function sanitizeRichText(html: string) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}

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
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized. Please log in first.' }, { status: 401 });
    }

    const user = await findUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User account not found.' }, { status: 401 });
    }

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

    if (!title || !city || !price_nzd_week) {
      return NextResponse.json(
        { error: 'title, city, price_nzd_week are required' },
        { status: 400 }
      );
    }

    const parsedLat = Number(body.latitude);
    const parsedLng = Number(body.longitude);
    const hasManualCoords = Number.isFinite(parsedLat) && Number.isFinite(parsedLng);
    const inferred = hasManualCoords ? null : inferCoordsFromCity(city);

    const latitude = hasManualCoords ? parsedLat : (inferred?.[0] ?? null);
    const longitude = hasManualCoords ? parsedLng : (inferred?.[1] ?? null);

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
      user_id: Number(user.id),
      title,
      city,
      source_url,
      price_nzd_week,
      image_urls: [...imageUrlsFromArray, ...imageUrlsFromText, ...imageUrlSingle],
      description: body.description ? sanitizeRichText(String(body.description)) : null,
      furnished: Boolean(body.furnished),
      bills_included: Boolean(body.bills_included),
      near_school: body.near_school ? String(body.near_school).trim() : null,
      duration_days: Number(body.duration_days || 30),
      available_date: body.available_date ? String(body.available_date).trim() : null,
      latitude,
      longitude
    });

    await trackEvent({
      event_name: 'listing_created',
      user_id: Number(user.id),
      listing_id: Number(created.id),
      meta: { status: created.status || 'pending' }
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
