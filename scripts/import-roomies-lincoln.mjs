#!/usr/bin/env node
import pg from 'pg';
const { Pool } = pg;

const AREAS = {
  lincoln: { listUrl: 'https://www.roomies.co.nz/rooms/lincoln-canterbury', nearSchool: 'Lincoln University', cityHint: /lincoln|canterbury/i },
  auckland: { listUrl: 'https://www.roomies.co.nz/rooms/auckland', nearSchool: 'University of Auckland', cityHint: /auckland/i },
  hamilton: { listUrl: 'https://www.roomies.co.nz/rooms/hamilton', nearSchool: 'University of Waikato', cityHint: /hamilton|waikato/i },
  wellington: { listUrl: 'https://www.roomies.co.nz/rooms/wellington', nearSchool: 'Victoria University of Wellington', cityHint: /wellington/i },
  christchurch: { listUrl: 'https://www.roomies.co.nz/rooms/christchurch', nearSchool: 'University of Canterbury', cityHint: /christchurch|canterbury/i },
  dunedin: { listUrl: 'https://www.roomies.co.nz/rooms/dunedin', nearSchool: 'University of Otago', cityHint: /dunedin|otago/i },
  'palmerston-north': { listUrl: 'https://www.roomies.co.nz/rooms/palmerston-north', nearSchool: 'Massey University', cityHint: /palmerston|manawatu/i }
};

const AREA = String(process.argv[2] || 'lincoln').toLowerCase();
const LIMIT = Number(process.argv[3] || 10);
const DRY_RUN = process.argv.includes('--dry-run');

if (!AREAS[AREA]) {
  console.error(`Unknown area '${AREA}'. Available: ${Object.keys(AREAS).join(', ')}`);
  process.exit(1);
}

const LIST_URL = AREAS[AREA].listUrl;

function req(url) {
  return fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; RentFinderBot/1.0; +https://www.rentfinder.nz)'
    }
  }).then((r) => {
    if (!r.ok) throw new Error(`${url} -> ${r.status}`);
    return r.text();
  });
}

function extractRoomIds(html) {
  const ids = [];
  const re = /\/rooms\/(\d+)/g;
  let m;
  while ((m = re.exec(html))) {
    if (!ids.includes(m[1])) ids.push(m[1]);
  }
  return ids;
}

function pickRoomJsonLd(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((x) => x[1]);
  for (const b of blocks) {
    try {
      const j = JSON.parse(b.trim());
      if (j?.['@type'] === 'Room') return j;
    } catch {}
  }
  return null;
}

function parseWeeklyPrice(html) {
  const m = html.match(/Rent<\/div>\s*\$\s*([0-9]{2,4})\s*per week/i) || html.match(/\$\s*([0-9]{2,4})\s*per week/i);
  return m ? Number(m[1]) : 0;
}

function toListing(roomId, html, cityHint) {
  const ld = pickRoomJsonLd(html);
  if (!ld) return null;

  const name = String(ld.name || '').trim();
  const parts = name.split('|').map((x) => x.trim()).filter(Boolean);
  const title = parts.slice(0, 2).join(' · ') || `Room listing #${roomId}`;

  const cityRaw = parts.find((p) => cityHint.test(p)) || parts.find((p) => /new zealand/i.test(p)) || parts[1] || 'New Zealand';
  const city = cityRaw.includes('New Zealand') ? cityRaw : `${cityRaw}, New Zealand`;

  const price = parseWeeklyPrice(html);
  if (!price) return null;

  return {
    sourceUrl: `https://www.roomies.co.nz/rooms/${roomId}`,
    title,
    city,
    price,
    description: `[External listing from Roomies]\n\n${String(ld.description || '').trim()}`,
    latitude: Number(ld.latitude || 0) || null,
    longitude: Number(ld.longitude || 0) || null,
    image: typeof ld.photo?.url === 'string' ? ld.photo.url : null,
    address: typeof ld.address === 'string' ? ld.address : null
  };
}

async function main() {
  const hasDb = Boolean(process.env.DATABASE_URL);
  const p = hasDb ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;

  const userId = p
    ? Number((await p.query(`SELECT id FROM users ORDER BY id ASC LIMIT 1`)).rows[0]?.id || 1)
    : 1;

  const listHtml = await req(LIST_URL);
  const roomIds = extractRoomIds(listHtml).slice(0, Math.max(1, LIMIT));

  let imported = 0;
  let skipped = 0;
  const samples = [];

  for (const roomId of roomIds) {
    try {
      const url = `https://www.roomies.co.nz/rooms/${roomId}`;
      const html = await req(url);
      const item = toListing(roomId, html, AREAS[AREA].cityHint);
      if (!item) {
        skipped++;
        continue;
      }

      samples.push({
        source_url: item.sourceUrl,
        title: item.title,
        city: item.city,
        price_nzd_week: item.price
      });

      if (!DRY_RUN && p) {
        const exists = await p.query(`SELECT id FROM listings WHERE source_url=$1 LIMIT 1`, [url]);
        if (exists.rowCount) {
          skipped++;
          continue;
        }

        await p.query(
          `
            INSERT INTO listings (
              user_id, title, city, price_nzd_week, source_url, image_urls, description,
              furnished, bills_included, near_school, latitude, longitude,
              expires_at, status
            )
            VALUES (
              $1, $2, $3, $4, $5, $6::text[], $7,
              $8, $9, $10, $11, $12,
              NOW() + interval '60 days', 'approved'
            )
          `,
          [
            userId,
            item.title,
            item.city,
            item.price,
            item.sourceUrl,
            item.image ? [item.image] : [],
            item.description,
            /furnished/i.test(item.title),
            /inc\./i.test(html) || /included/i.test(item.description),
            AREAS[AREA].nearSchool,
            item.latitude,
            item.longitude
          ]
        );

        imported++;
      }
    } catch (e) {
      skipped++;
    }
  }

  if (p) await p.end();

  console.log(
    JSON.stringify(
      {
        mode: DRY_RUN || !hasDb ? 'dry-run' : 'import',
        area: AREA,
        imported,
        skipped,
        checked: roomIds.length,
        sample: samples.slice(0, 3),
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
