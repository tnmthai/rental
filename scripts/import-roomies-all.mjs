#!/usr/bin/env node
/**
 * Import rental listings from roomies.co.nz for ALL cities
 * Usage:
 *   node scripts/import-roomies-all.mjs [--dry-run]
 *
 * Imports 10 listings per city. Skips duplicates by source_url.
 */
import pg from 'pg';
const { Pool } = pg;

const CITIES = {
  auckland: 'Auckland',
  hamilton: 'Hamilton',
  wellington: 'Wellington',
  christchurch: 'Christchurch',
  dunedin: 'Dunedin',
  queenstown: 'Queenstown',
  tauranga: 'Tauranga',
  'palmerston-north': 'Palmerston North',
  napier: 'Napier',
  newplymouth: 'New Plymouth'
};

const LIMIT = 10;
const DRY_RUN = process.argv.includes('--dry-run');

const DB_URL = 'postgresql://postgres:aczNHBhmSbeAQUrekRJRDMakipYjZHcK@hopper.proxy.rlwy.net:38106/railway';

// ─── helpers ──────────────────────────────────────────────────

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-NZ,en;q=0.9'
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function extractListingIds(html) {
  const ids = new Set();
  const re = /\/rooms\/(\d+)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    ids.add(m[1]);
  }
  return [...ids];
}

function parseListing(html, id, cityName) {
  const url = `https://www.roomies.co.nz/rooms/${id}`;

  const ldMatches = [...html.matchAll(/application\/ld\+json">(.*?)<\/script>/gs)];
  let ld = {};
  for (const m of ldMatches) {
    try {
      const obj = JSON.parse(m[1].replace(/\\\//g, '/'));
      if (obj['@type'] === 'Room') { ld = obj; break; }
    } catch {}
  }

  const nameParts = (ld.name || '').split('|').map(s => s.trim());
  const title = nameParts[0] || '';
  const description = (ld.description || '').replace(/\r\n/g, '\n').trim();
  const latitude = ld.latitude || null;
  const longitude = ld.longitude || null;
  const photoUrl = ld.photo?.url || '';

  let price = 0;
  const priceMatch = html.match(/\$([0-9,]+)\s*(?:per\s*week|\/week)/i);
  if (priceMatch) {
    price = parseInt(priceMatch[1].replace(/,/g, ''), 10);
  }
  if (!price) {
    const priceMatch2 = html.match(/\$([0-9,]+)/);
    if (priceMatch2) {
      price = parseInt(priceMatch2[1].replace(/,/g, ''), 10);
    }
  }

  const billsIncluded = /inc\.|bills?\s*included|all\s*bills/i.test(html);
  const furnished = /furnished/i.test(html) && !/unfurnished/i.test(html);

  const imageUrls = [];
  if (photoUrl) imageUrls.push(photoUrl);
  const imgRe = /cloudinary\.roomies\.pics\/image\/upload\/[^"'\s]+/g;
  let imgM;
  while ((imgM = imgRe.exec(html)) !== null) {
    const full = 'https://' + imgM[0];
    if (!imageUrls.includes(full)) imageUrls.push(full);
  }

  return {
    title,
    city: cityName,
    price,
    url,
    furnished,
    billsIncluded,
    description,
    latitude,
    longitude,
    imageUrls: imageUrls.slice(0, 5)
  };
}

// ─── main ─────────────────────────────────────────────────────

console.log(`🏠 Importing from roomies.co.nz — ALL cities (${LIMIT} per city${DRY_RUN ? ', DRY RUN' : ''})\n`);

const pool = new Pool({ connectionString: DB_URL });

// Get existing source_urls to skip duplicates
const { rows: existingRows } = await pool.query('SELECT source_url FROM listings WHERE source_url IS NOT NULL');
const existingUrls = new Set(existingRows.map(r => r.source_url));
console.log(`📋 ${existingUrls.size} existing listings in DB\n`);

let totalInserted = 0;
let totalSkipped = 0;
let totalFailed = 0;

for (const [citySlug, cityName] of Object.entries(CITIES)) {
  console.log(`\n━━━ ${cityName} ━━━`);

  const baseUrl = `https://www.roomies.co.nz/rooms/${citySlug}`;

  try {
    console.log(`  📄 Fetching: ${baseUrl}`);
    const listHtml = await fetchHtml(baseUrl);
    const allIds = extractListingIds(listHtml);
    console.log(`  Found ${allIds.length} listings on page`);

    const ids = allIds.slice(0, LIMIT + 5); // fetch extra in case some are invalid
    let cityInserted = 0;
    let citySkipped = 0;

    for (const id of ids) {
      if (cityInserted >= LIMIT) break;

      try {
        const listingUrl = `https://www.roomies.co.nz/rooms/${id}`;

        // Skip if already in DB
        if (existingUrls.has(listingUrl)) {
          citySkipped++;
          totalSkipped++;
          continue;
        }

        const html = await fetchHtml(listingUrl);
        const data = parseListing(html, id, cityName);

        if (!data.title || data.price <= 0) {
          console.log(`  ⚠️  [${id}] Skipped — missing title or price`);
          totalFailed++;
          continue;
        }

        if (DRY_RUN) {
          console.log(`  ✅ [${id}] ${data.title} — $${data.price}/wk${data.furnished ? ' (furnished)' : ''}${data.billsIncluded ? ' inc.' : ''}`);
          cityInserted++;
          totalInserted++;
          existingUrls.add(listingUrl);
        } else {
          await pool.query(
            `INSERT INTO listings (title, city, price_nzd_week, source_url, furnished, bills_included, description, latitude, longitude, image_urls, status, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'approved', NOW())`,
            [data.title, data.city, data.price, data.url, data.furnished, data.billsIncluded, data.description, data.latitude, data.longitude, data.imageUrls]
          );
          console.log(`  ✅ [${id}] ${data.title} — $${data.price}/wk${data.furnished ? ' (furnished)' : ''}${data.billsIncluded ? ' inc.' : ''}`);
          cityInserted++;
          totalInserted++;
          existingUrls.add(listingUrl);
        }
      } catch (err) {
        console.log(`  ❌ [${id}] Error: ${err.message}`);
        totalFailed++;
      }

      await new Promise(r => setTimeout(r, 400));
    }

    console.log(`  📊 ${cityName}: +${cityInserted} inserted, ${citySkipped} skipped`);
  } catch (err) {
    console.log(`  ❌ Failed to fetch ${cityName}: ${err.message}`);
  }

  await new Promise(r => setTimeout(r, 600));
}

await pool.end();

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`✅ DONE! Inserted: ${totalInserted}, Skipped: ${totalSkipped}, Failed: ${totalFailed}`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

// Notify IndexNow
if (totalInserted > 0 && !DRY_RUN) {
  try {
    const indexNowKey = '842d43d77ea7f789e79e927f1e4c2a4e';
    const payload = JSON.stringify({
      host: 'www.rentfinder.nz',
      key: indexNowKey,
      urlList: ['/', '/blog', ...Object.keys(CITIES).map(c => `/rent/${c}`)]
    });
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: payload
    }).then(r => console.log(`📡 IndexNow notified (status: ${r.status})`))
      .catch(() => console.log('⚠️ IndexNow notification failed'));
  } catch {}
}
