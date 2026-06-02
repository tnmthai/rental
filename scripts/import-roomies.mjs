#!/usr/bin/env node
/**
 * Import rental listings from roomies.co.nz
 * Usage:
 *   node scripts/import-roomies.mjs [city] [limit] [--dry-run]
 *
 * Cities: auckland (default), christchurch, wellington, dunedin, queenstown, hamilton, tauranga
 * Default limit: 10
 */
import pg from 'pg';
const { Pool } = pg;

const CITIES = {
  auckland: 'auckland',
  christchurch: 'christchurch',
  wellington: 'wellington',
  dunedin: 'dunedin',
  queenstown: 'queenstown',
  hamilton: 'hamilton',
  tauranga: 'tauranga'
};

const CITY_LABELS = {
  auckland: 'Auckland',
  christchurch: 'Christchurch',
  wellington: 'Wellington',
  dunedin: 'Dunedin',
  queenstown: 'Queenstown',
  hamilton: 'Hamilton',
  tauranga: 'Tauranga'
};

const CITY = String(process.argv[2] || 'auckland').toLowerCase();
const LIMIT = Number(process.argv[3] || 10);
const DRY_RUN = process.argv.includes('--dry-run');

if (!CITIES[CITY]) {
  console.error(`Unknown city '${CITY}'. Available: ${Object.keys(CITIES).join(', ')}`);
  process.exit(1);
}

const BASE_URL = `https://www.roomies.co.nz/rooms/${CITIES[CITY]}`;
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
  // Match /rooms/XXXXXXX links
  const ids = new Set();
  const re = /\/rooms\/(\d+)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    ids.add(m[1]);
  }
  return [...ids];
}

function parseListing(html, id) {
  const url = `https://www.roomies.co.nz/rooms/${id}`;

  // JSON-LD structured data
  const ldMatches = [...html.matchAll(/application\/ld\+json">(.*?)<\/script>/gs)];
  let ld = {};
  for (const m of ldMatches) {
    try {
      const obj = JSON.parse(m[1].replace(/\\\//g, '/'));
      if (obj['@type'] === 'Room') { ld = obj; break; }
    } catch {}
  }

  // Title from JSON-LD name: "Furnished room with own bathroom in a house | Browns Bay, Auckland 0630 | desc..."
  const nameParts = (ld.name || '').split('|').map(s => s.trim());
  const title = nameParts[0] || '';
  const locationStr = nameParts[1] || '';

  // Description
  const description = (ld.description || '').replace(/\r\n/g, '\n').trim();

  // Coordinates
  const latitude = ld.latitude || null;
  const longitude = ld.longitude || null;

  // Photo
  const photoUrl = ld.photo?.url || '';

  // Price: look for "$XXX per week" pattern
  let price = 0;
  const priceMatch = html.match(/\$([0-9,]+)\s*(?:per\s*week|\/week)/i);
  if (priceMatch) {
    price = parseInt(priceMatch[1].replace(/,/g, ''), 10);
  }
  // Fallback: just look for price near "per week"
  if (!price) {
    const priceMatch2 = html.match(/\$([0-9,]+)/);
    if (priceMatch2) {
      price = parseInt(priceMatch2[1].replace(/,/g, ''), 10);
    }
  }

  // Bills included: "inc." after price or "bills included"
  const billsIncluded = /inc\.|bills?\s*included|all\s*bills/i.test(html);

  // Furnished / Unfurnished
  const furnished = /furnished/i.test(html) && !/unfurnished/i.test(html);

  // City from location string or default
  const city = CITY_LABELS[CITY];

  // Additional images from gallery
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
    city,
    price,
    url,
    furnished,
    billsIncluded,
    description,
    latitude,
    longitude,
    imageUrls: imageUrls.slice(0, 5) // max 5 images
  };
}

// ─── main ─────────────────────────────────────────────────────

console.log(`🏠 Importing from roomies.co.nz — ${CITY_LABELS[CITY]} (limit: ${LIMIT}${DRY_RUN ? ', DRY RUN' : ''})`);

// 1. Fetch listing page to get IDs
console.log(`\n📄 Fetching listing page: ${BASE_URL}`);
const listHtml = await fetchHtml(BASE_URL);
const allIds = extractListingIds(listHtml);
console.log(`   Found ${allIds.length} listing IDs on page`);

const ids = allIds.slice(0, LIMIT);
console.log(`   Will process: ${ids.length} listings\n`);

// 2. Fetch each listing
const listings = [];
for (const id of ids) {
  try {
    const html = await fetchHtml(`https://www.roomies.co.nz/rooms/${id}`);
    const data = parseListing(html, id);
    if (data.title && data.price > 0) {
      listings.push(data);
      console.log(`   ✅ [${id}] ${data.title} — $${data.price}/wk${data.furnished ? ' (furnished)' : ''}${data.billsIncluded ? ' inc.' : ''}`);
    } else {
      console.log(`   ⚠️  [${id}] Skipped — missing title or price`);
    }
  } catch (err) {
    console.log(`   ❌ [${id}] Error: ${err.message}`);
  }
  // Small delay to be polite
  await new Promise(r => setTimeout(r, 500));
}

console.log(`\n📊 Parsed ${listings.length} valid listings`);

if (listings.length === 0) {
  console.log('Nothing to import. Exiting.');
  process.exit(0);
}

if (DRY_RUN) {
  console.log('\n🔍 DRY RUN — not inserting into DB. Sample:');
  console.log(JSON.stringify(listings[0], null, 2));
  process.exit(0);
}

// 3. Insert into DB
const pool = new Pool({ connectionString: DB_URL });

let inserted = 0;
let skipped = 0;

for (const l of listings) {
  try {
    // Check if already exists by source_url
    const existing = await pool.query('SELECT id FROM listings WHERE source_url = $1', [l.url]);
    if (existing.rows.length > 0) {
      skipped++;
      continue;
    }

    await pool.query(
      `INSERT INTO listings (title, city, price_nzd_week, source_url, furnished, bills_included, description, latitude, longitude, image_urls, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', NOW())`,
      [l.title, l.city, l.price, l.url, l.furnished, l.billsIncluded, l.description, l.latitude, l.longitude, l.imageUrls]
    );
    inserted++;
  } catch (err) {
    console.error(`   DB error for ${l.url}: ${err.message}`);
  }
}

await pool.end();

console.log(`\n✅ Done! Inserted: ${inserted}, Skipped (duplicates): ${skipped}`);

// Notify IndexNow (Bing, Yandex) about new listings
if (inserted > 0) {
  try {
    const indexNowKey = '842d43d77ea7f789e79e927f1e4c2a4e';
    const payload = JSON.stringify({
      host: 'www.rentfinder.nz',
      key: indexNowKey,
      urlList: ['/', '/blog', `/rent/${CITY}`]
    });
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: payload
    }).then(r => console.log(`📡 IndexNow notified (status: ${r.status})`))
      .catch(() => console.log('⚠️ IndexNow notification failed'));
  } catch {}
}
