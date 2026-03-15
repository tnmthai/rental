import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createListing, findUserByEmail, listRecentListings, trackEvent } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

const NZ_COORDS: Record<string, [number, number]> = {
  // Major towns / cities
  auckland: [-36.8485, 174.7633],
  wellington: [-41.2866, 174.7756],
  christchurch: [-43.5321, 172.6362],
  hamilton: [-37.787, 175.2793],
  dunedin: [-45.8788, 170.5028],
  nelson: [-41.2706, 173.284],
  lincoln: [-43.63950666667498, 172.48711644204522],
  rolleston: [-43.5947, 172.3822],
  palmerston_north: [-40.3564, 175.6111],
  tauranga: [-37.6878, 176.1651],
  rotorua: [-38.1368, 176.2497],
  napier: [-39.4928, 176.912],
  hastings: [-39.6381, 176.8495],
  new_plymouth: [-39.0556, 174.0752],
  whangarei: [-35.7251, 174.3237],
  invercargill: [-46.4132, 168.3538],
  queenstown: [-45.0312, 168.6626],
  wanaka: [-44.6967, 169.1367],
  blenheim: [-41.5134, 173.9612],
  gisborne: [-38.6623, 178.0176],
  masterton: [-40.9497, 175.6573],
  whanganui: [-39.9333, 175.05],

  // District / region centroids (fallback)
  northland: [-35.6, 174.3],
  waikato: [-37.7833, 175.2833],
  bay_of_plenty: [-37.7, 176.2],
  hawkes_bay: [-39.5, 176.9],
  taranaki: [-39.2, 174.1],
  manawatu_whanganui: [-40.0, 175.4],
  tasman: [-41.3, 172.9],
  marlborough: [-41.5, 173.9],
  west_coast: [-42.4, 171.2],
  canterbury: [-43.5, 171.5],
  selwyn: [-43.65, 172.25],
  otago: [-45.2, 170.3],
  southland: [-46.2, 168.4],
  new_zealand: [-41.2865, 174.7762],
  nz: [-41.2865, 174.7762]
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

function toLookupKeys(input: string): string[] {
  const base = input.trim();
  if (!base) return [];

  const clean = base
    .replace(/\b(district|city|region)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const compact = clean.replace(/\s+/g, '_');
  const words = clean.split(/\s+/).filter(Boolean);

  const keys = new Set<string>([base, clean, compact]);
  for (const w of words) keys.add(w);
  for (let i = 0; i < words.length - 1; i++) keys.add(`${words[i]}_${words[i + 1]}`);
  if (words.length >= 3) keys.add(`${words[0]}_${words[1]}_${words[2]}`);

  return Array.from(keys).filter(Boolean);
}

function inferCoordsFromCity(city: string): [number, number] | null {
  const normalized = normalizePlaceKey(city);
  if (!normalized) return null;

  const parts = normalized.split(',').map((x) => x.trim()).filter(Boolean);

  // Prefer town/suburb first (left-most), then area, then region.
  const orderedCandidates = parts.length ? [...parts, ...[...parts].reverse()] : [normalized];

  for (const c of orderedCandidates) {
    const keys = toLookupKeys(c);
    for (const key of keys) {
      if (NZ_COORDS[key]) return NZ_COORDS[key];
    }
  }

  for (const key of toLookupKeys(normalized)) {
    if (NZ_COORDS[key]) return NZ_COORDS[key];
  }

  return NZ_COORDS.new_zealand;
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
