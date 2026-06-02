#!/usr/bin/env node
/**
 * Import rental listings from realestate.co.nz API
 * Usage:
 *   node scripts/import-realestate.mjs [region] [limit] [--dry-run]
 *
 * Regions: auckland (default), wellington, canterbury, waikato, otago
 * Default limit: 10
 */
import pg from 'pg';
const { Pool } = pg;

const REGIONS = {
  auckland: { id: 35, label: 'Auckland' },
  wellington: { id: 39, label: 'Wellington' },
  canterbury: { id: 12, label: 'Canterbury' },
  waikato: { id: 40, label: 'Waikato' },
  otago: { id: 30, label: 'Otago' }
};

const REGION = String(process.argv[2] || 'auckland').toLowerCase();
const LIMIT = Number(process.argv[3] || 10);
const DRY_RUN = process.argv.includes('--dry-run');

if (!REGIONS[REGION]) {
  console.error(`Unknown region '${REGION}'. Available: ${Object.keys(REGIONS).join(', ')}`);
  process.exit(1);
}

const API_BASE = 'https://platform.realestate.co.nz/search/v1/listings';
const MEDIA_BASE = 'https://mediaserver.realestate.co.nz';

function buildUrl(regionId, limit) {
  const params = new URLSearchParams();
  params.append('filter[category][]', 'res_rent');
  params.append('filter[region][]', String(regionId));
  params.append('page[limit]', String(limit));
  params.append('page[offset]', '0');
  return `${API_BASE}?${params.toString()}`;
}

function parsePrice(priceDisplay) {
  if (!priceDisplay) return 0;
  const m = priceDisplay.match(/\$([0-9,]+)/);
  return m ? Number(m[1].replace(/,/g, '')) : 0;
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toWeekly(price, priceFreq) {
  if (!price) return 0;
  const freq = (priceFreq || '').toLowerCase();
  if (freq.includes('week')) return price;
  if (freq.includes('fortnight') || freq.includes('2 week')) return Math.round(price / 2);
  if (freq.includes('month')) return Math.round(price / 4.33);
  return price; // assume weekly
}

function buildImageUrl(photo) {
  if (!photo || !photo['base-url']) return null;
  return `${MEDIA_BASE}${photo['base-url']}.crop.600x400.jpg`;
}

async function main() {
  const hasDb = Boolean(process.env.DATABASE_URL);
  const pool = hasDb ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;

  const userId = pool
    ? Number((await pool.query('SELECT id FROM users ORDER BY id ASC LIMIT 1')).rows[0]?.id || 1)
    : 1;

  const url = buildUrl(REGIONS[REGION].id, LIMIT);
  console.log(`Fetching from realestate.co.nz (${REGIONS[REGION].label})...`);

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; RentFinderBot/1.0; +https://www.rentfinder.nz)',
      'Accept': 'application/vnd.api+json',
      'Referer': `https://www.realestate.co.nz/residential/rental/${REGION}`
    }
  });

  if (!res.ok) {
    console.error(`API returned ${res.status}`);
    process.exit(1);
  }

  const json = await res.json();
  const items = json.data || [];
  console.log(`Found ${json.meta?.totalResults || 0} total, got ${items.length} listings`);

  let imported = 0;
  let skipped = 0;
  const samples = [];

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
      const region = addr['region'] || REGIONS[REGION].label;
      const city = suburb ? `${suburb}, ${region}` : region;
      const lat = parseFloat(addr['latitude']) || null;
      const lng = parseFloat(addr['longitude']) || null;
      const bedrooms = attrs['bedroom-count'] || 0;
      const bathrooms = attrs['bathroom-count'] || 0;
      const description = stripHtml(attrs['description']);
      const sourceUrl = `https://www.realestate.co.nz/${item.id}`;

      // Build title
      const titleParts = [fullAddr || `${bedrooms}bd rental`];
      if (bedrooms) titleParts.push(`${bedrooms} bed`);
      titleParts.push(priceDisplay);
      const title = titleParts.join(' · ');

      // Images
      const photos = attrs['photos'] || [];
      const imageUrls = photos
        .slice(0, 5)
        .map(buildImageUrl)
        .filter(Boolean);

      const furnished = /furnish/i.test(description) || /furnish/i.test(title);
      const billsIncluded = /bills included/i.test(description) || /inclusive/i.test(description);

      const listing = {
        title,
        city,
        price_nzd_week: weeklyPrice,
        source_url: sourceUrl,
        image_urls: imageUrls,
        description: `[External listing from realestate.co.nz]\n\n${description}`,
        furnished,
        bills_included: billsIncluded,
        latitude: lat,
        longitude: lng,
        bedrooms,
        bathrooms
      };

      samples.push({
        title: listing.title,
        city: listing.city,
        price: listing.price_nzd_week,
        url: listing.source_url
      });

      if (!DRY_RUN && pool) {
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
          [
            userId,
            listing.title,
            listing.city,
            listing.price_nzd_week,
            listing.source_url,
            listing.image_urls,
            listing.description,
            listing.furnished,
            listing.bills_included,
            listing.latitude,
            listing.longitude
          ]
        );
        imported++;
      }
    } catch (e) {
      console.error('Error processing item:', e.message);
      skipped++;
    }
  }

  if (pool) await pool.end();

  // Notify IndexNow about new listings
  if (imported > 0 && !DRY_RUN) {
    try {
      const indexNowKey = '842d43d77ea7f789e79e927f1e4c2a4e';
      await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          host: 'www.rentfinder.nz',
          key: indexNowKey,
          urlList: ['/', '/blog', `/rent/${REGION}`]
        })
      }).then(r => console.error(`📡 IndexNow notified (status: ${r.status})`))
        .catch(() => console.error('⚠️ IndexNow notification failed'));
    } catch {}
  }

  console.log(
    JSON.stringify(
      {
        mode: DRY_RUN || !hasDb ? 'dry-run' : 'import',
        source: 'realestate.co.nz',
        region: REGION,
        imported,
        skipped,
        checked: items.length,
        samples: samples.slice(0, 5),
        note: hasDb ? undefined : 'DATABASE_URL missing; run with env to import into DB.'
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
