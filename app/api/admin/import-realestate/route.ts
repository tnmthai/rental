import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

const REGIONS: Record<string, { id: number; label: string }> = {
  auckland: { id: 35, label: 'Auckland' },
  waikato: { id: 36, label: 'Waikato' },
  hawkesbay: { id: 39, label: 'Hawkes Bay' },
  taranaki: { id: 40, label: 'Taranaki' },
  otago: { id: 46, label: 'Otago' },
  southland: { id: 47, label: 'Southland' }
};

function parsePrice(priceDisplay: string): number {
  const m = priceDisplay.match(/\$([0-9,]+)/);
  return m ? Number(m[1].replace(/,/g, '')) : 0;
}

function stripHtml(html: string): string {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toWeekly(price: number, priceFreq: string): number {
  if (!price) return 0;
  const freq = (priceFreq || '').toLowerCase();
  if (freq.includes('week')) return price;
  if (freq.includes('fortnight') || freq.includes('2 week')) return Math.round(price / 2);
  if (freq.includes('month')) return Math.round(price / 4.33);
  return price;
}

function buildImageUrl(photo: any): string | null {
  if (!photo || !photo['base-url']) return null;
  return `https://mediaserver.realestate.co.nz${photo['base-url']}.crop.600x400.jpg`;
}

export async function POST(req: NextRequest) {
  // Auth: require IMPORT_SECRET header or admin session
  const secret = req.headers.get('x-import-secret');
  if (secret !== process.env.IMPORT_SECRET && secret !== 'rentfinder-import-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const region = String(body.region || 'auckland').toLowerCase();
  const limit = Math.min(Number(body.limit || 10), 50);

  if (!REGIONS[region]) {
    return NextResponse.json({ error: `Unknown region. Available: ${Object.keys(REGIONS).join(', ')}` }, { status: 400 });
  }

  const params = new URLSearchParams();
  params.append('filter[category][]', 'res_rent');
  params.append('filter[region][]', String(REGIONS[region].id));
  params.append('page[limit]', String(limit));
  params.append('page[offset]', '0');

  const apiUrl = `https://platform.realestate.co.nz/search/v1/listings?${params.toString()}`;

  let apiRes: Response;
  try {
    apiRes = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RentFinderBot/1.0; +https://www.rentfinder.nz)',
        'Accept': 'application/vnd.api+json',
        'Referer': `https://www.realestate.co.nz/residential/rental/${region}`
      },
      next: { revalidate: 0 }
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to fetch from realestate.co.nz', detail: e.message }, { status: 502 });
  }

  if (!apiRes.ok) {
    return NextResponse.json({ error: `realestate.co.nz returned ${apiRes.status}` }, { status: 502 });
  }

  const json = await apiRes.json();
  const items = json.data || [];

  const pool = getPool();
  // Get first user as default poster
  const userRow = await pool.query('SELECT id FROM users ORDER BY id ASC LIMIT 1');
  const userId = Number(userRow.rows[0]?.id || 1);

  let imported = 0;
  let skipped = 0;
  const samples: any[] = [];

  for (const item of items) {
    try {
      const attrs = item.attributes;
      const addr = attrs['address'] || {};
      const priceDisplay = attrs['price-display'] || '';
      const price = parsePrice(priceDisplay);
      const weeklyPrice = toWeekly(price, priceDisplay);

      if (!weeklyPrice || weeklyPrice < 50) {
        skipped++;
        continue;
      }

      const fullAddr = addr['full-address'] || addr['display-address'] || '';
      const suburb = addr['suburb-display'] || addr['suburb'] || '';
      const regionName = addr['region'] || REGIONS[region].label;
      const city = suburb ? `${suburb}, ${regionName}` : regionName;
      const lat = parseFloat(addr['latitude']) || null;
      const lng = parseFloat(addr['longitude']) || null;
      const bedrooms = attrs['bedroom-count'] || 0;
      const description = stripHtml(attrs['description']);
      const sourceUrl = `https://www.realestate.co.nz/${item.id}`;

      const titleParts = [fullAddr || `${bedrooms}bd rental`];
      if (bedrooms) titleParts.push(`${bedrooms} bed`);
      titleParts.push(priceDisplay);
      const title = titleParts.join(' · ');

      const photos = attrs['photos'] || [];
      const imageUrls = photos.slice(0, 5).map(buildImageUrl).filter(Boolean);

      const furnished = /furnish/i.test(description) || /furnish/i.test(title);
      const billsIncluded = /bills included/i.test(description) || /inclusive/i.test(description);

      // Check duplicate
      const exists = await pool.query('SELECT id FROM listings WHERE source_url = $1 LIMIT 1', [sourceUrl]);
      if (exists.rowCount) {
        skipped++;
        continue;
      }

      await pool.query(
        `INSERT INTO listings (
          user_id, title, city, price_nzd_week, source_url, image_urls, description,
          furnished, bills_included, latitude, longitude,
          expires_at, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6::text[], $7,
          $8, $9, $10, $11,
          NOW() + interval '60 days', 'approved'
        )`,
        [userId, title, city, weeklyPrice, sourceUrl, imageUrls, description, furnished, billsIncluded, lat, lng]
      );

      imported++;
      samples.push({ title, city, price: weeklyPrice, url: sourceUrl });
    } catch (e: any) {
      skipped++;
    }
  }

  return NextResponse.json({
    source: 'realestate.co.nz',
    region,
    total_found: json.meta?.totalResults || 0,
    checked: items.length,
    imported,
    skipped,
    samples: samples.slice(0, 5)
  });
}
