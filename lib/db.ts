import { Pool } from 'pg';

let pool: Pool | null = null;
let listingGeoColumnsEnsured = false;

export type ListingSearch = {
  city?: string;
  suburb?: string;
  maxPrice?: number;
  furnished?: boolean;
  billsIncluded?: boolean;
  nearSchool?: string;
  queryText?: string;
};

export type SavedSearchInput = {
  user_id: number;
  name: string;
  query: string;
  filters_json?: Record<string, unknown>;
};

export type NewListing = {
  user_id: number;
  title: string;
  city: string;
  price_nzd_week: number;
  source_url?: string;
  image_urls?: string[];
  description?: string | null;
  furnished?: boolean;
  bills_included?: boolean;
  near_school?: string | null;
  duration_days?: number;
  available_date?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing');
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

async function ensureListingGeoColumns() {
  if (listingGeoColumnsEnsured) return;
  const p = getPool();
  await p.query(`ALTER TABLE listings ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION`);
  await p.query(`ALTER TABLE listings ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION`);
  listingGeoColumnsEnsured = true;
}

export async function searchListings(filters: ListingSearch) {
  const p = getPool();
  await ensureListingGeoColumns();
  const params: Array<string | number | boolean> = [];
  const where: string[] = ["status = 'approved'", '(expires_at IS NULL OR expires_at > now())'];

  const asNonEmptyString = (v: unknown): string | undefined => {
    if (typeof v === 'string') {
      const t = v.trim();
      return t ? t : undefined;
    }
    return undefined;
  };

  const city = asNonEmptyString(filters.city);
  const suburb = asNonEmptyString(filters.suburb);
  const nearSchool = asNonEmptyString(filters.nearSchool);
  const maxPrice = Number.isFinite(Number(filters.maxPrice)) && Number(filters.maxPrice) > 0 ? Number(filters.maxPrice) : undefined;

  // Build condition score from requested filters.
  // Full matches (score = conditionCount) are ranked first, then partial matches.
  const scoreParts: string[] = [];

  if (city) {
    params.push(`%${city}%`);
    where.push(`city ILIKE $${params.length}`);
    scoreParts.push(`CASE WHEN city ILIKE $${params.length} THEN 1 ELSE 0 END`);
  }

  if (suburb) {
    params.push(`%${suburb}%`);
    where.push(`(title ILIKE $${params.length} OR description ILIKE $${params.length} OR city ILIKE $${params.length})`);
    scoreParts.push(`CASE WHEN (title ILIKE $${params.length} OR description ILIKE $${params.length} OR city ILIKE $${params.length}) THEN 1 ELSE 0 END`);
  }

  if (maxPrice) {
    params.push(maxPrice);
    scoreParts.push(`CASE WHEN price_nzd_week <= $${params.length} THEN 1 ELSE 0 END`);
  }

  if (filters.furnished === true) {
    scoreParts.push('CASE WHEN furnished = true THEN 1 ELSE 0 END');
  }

  if (filters.billsIncluded === true) {
    scoreParts.push('CASE WHEN bills_included = true THEN 1 ELSE 0 END');
  }

  if (nearSchool) {
    params.push(`%${nearSchool}%`);
    scoreParts.push(`CASE WHEN near_school ILIKE $${params.length} THEN 1 ELSE 0 END`);
  }

  const conditionCount = scoreParts.length;
  const scoreExpr = conditionCount > 0 ? scoreParts.join(' + ') : '0';

  // If user gave at least one condition, only show rows that satisfy >= 1 condition.
  if (conditionCount > 0) {
    where.push(`(${scoreExpr}) >= 1`);
  }

  const orderBy = conditionCount > 0
    ? `(${scoreExpr}) DESC, price_nzd_week ASC, created_at DESC`
    : `price_nzd_week ASC, created_at DESC`;

  const sql = `
    SELECT
      id, user_id, title, city, price_nzd_week, source_url, image_urls, description,
      furnished, bills_included, near_school, latitude, longitude, created_at, expires_at,
      (${scoreExpr})::int AS match_score,
      ${conditionCount}::int AS condition_count
    FROM listings
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY ${orderBy}
    LIMIT 30
  `;

  const { rows } = await p.query(sql, params);
  return rows;
}

export async function createListing(input: NewListing) {
  const p = getPool();
  await ensureListingGeoColumns();
  const durationDays = Math.min(Math.max(Number(input.duration_days || 30), 1), 180);

  try {
    const { rows } = await p.query(
      `
        INSERT INTO listings (user_id, title, city, price_nzd_week, source_url, image_urls, description, furnished, bills_included, near_school, latitude, longitude, available_date, expires_at, status)
        VALUES ($1, $2, $3, $4, $5, $6::text[], $7, $8, $9, $10, $11, $12, $13::date, now() + make_interval(days => $14), 'pending')
        RETURNING id, user_id, title, city, price_nzd_week, source_url, image_urls, description, furnished, bills_included, near_school, latitude, longitude, available_date, created_at, expires_at, status
      `,
      [
        input.user_id,
        input.title,
        input.city,
        input.price_nzd_week,
        input.source_url || '',
        input.image_urls || [],
        input.description || null,
        Boolean(input.furnished),
        Boolean(input.bills_included),
        input.near_school || null,
        input.latitude ?? null,
        input.longitude ?? null,
        input.available_date || null,
        durationDays
      ]
    );
    return rows[0];
  } catch (e: any) {
    if (!String(e?.message || '').toLowerCase().includes('available_date')) throw e;

    const { rows } = await p.query(
      `
        INSERT INTO listings (user_id, title, city, price_nzd_week, source_url, image_urls, description, furnished, bills_included, near_school, latitude, longitude, expires_at, status)
        VALUES ($1, $2, $3, $4, $5, $6::text[], $7, $8, $9, $10, $11, $12, now() + make_interval(days => $13), 'pending')
        RETURNING id, user_id, title, city, price_nzd_week, source_url, image_urls, description, furnished, bills_included, near_school, latitude, longitude, created_at, expires_at, status
      `,
      [
        input.user_id,
        input.title,
        input.city,
        input.price_nzd_week,
        input.source_url || '',
        input.image_urls || [],
        input.description || null,
        Boolean(input.furnished),
        Boolean(input.bills_included),
        input.near_school || null,
        input.latitude ?? null,
        input.longitude ?? null,
        durationDays
      ]
    );
    return rows[0];
  }
}

export async function listRecentListings(limit = 20) {
  const p = getPool();
  await ensureListingGeoColumns();
  const { rows } = await p.query(
    `
      SELECT id, user_id, title, city, price_nzd_week, source_url, image_urls, description, furnished, bills_included, near_school, latitude, longitude, created_at, expires_at, status
      FROM listings
      ORDER BY created_at DESC
      LIMIT $1
    `,
    [Math.min(Math.max(limit, 1), 100)]
  );
  return rows;
}

export async function findUserByEmail(email: string) {
  const p = getPool();
  const { rows } = await p.query(
    `SELECT id, name, email, password_hash, provider, provider_id FROM users WHERE lower(email)=lower($1) LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

export async function findUserByProvider(provider: string, providerId: string) {
  const p = getPool();
  const { rows } = await p.query(
    `SELECT id, name, email, password_hash, provider, provider_id FROM users WHERE provider=$1 AND provider_id=$2 LIMIT 1`,
    [provider, providerId]
  );
  return rows[0] || null;
}

export async function createUser(input: {
  name?: string | null;
  email: string;
  passwordHash?: string | null;
  provider?: string | null;
  providerId?: string | null;
}) {
  const p = getPool();
  const { rows } = await p.query(
    `
      INSERT INTO users (name, email, password_hash, provider, provider_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, provider, provider_id
    `,
    [input.name || null, input.email, input.passwordHash || null, input.provider || 'email', input.providerId || null]
  );
  return rows[0];
}

export async function getListingsByUser(userId: number) {
  const p = getPool();
  const { rows } = await p.query(
    `SELECT id, title, city, price_nzd_week, status, created_at, expires_at FROM listings WHERE user_id=$1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

export async function updateListingStatus(listingId: number, status: 'approved' | 'rejected' | 'paused' | 'pending') {
  const p = getPool();
  const { rows } = await p.query(
    `UPDATE listings SET status=$1 WHERE id=$2 RETURNING id, status`,
    [status, listingId]
  );
  return rows[0] || null;
}

export async function extendListingExpiry(listingId: number, extraDays: number) {
  const p = getPool();
  const days = Math.min(Math.max(extraDays, 1), 180);
  const { rows } = await p.query(
    `UPDATE listings SET expires_at = COALESCE(expires_at, now()) + make_interval(days => $1) WHERE id=$2 RETURNING id, expires_at`,
    [days, listingId]
  );
  return rows[0] || null;
}

export async function listPendingListings() {
  const p = getPool();
  const { rows } = await p.query(
    `
      SELECT l.id, l.user_id, l.title, l.city, l.price_nzd_week, l.source_url, l.latitude, l.longitude, l.created_at, l.status,
             u.name AS user_name, u.email AS user_email
      FROM listings l
      LEFT JOIN users u ON u.id = l.user_id
      WHERE l.status='pending'
      ORDER BY l.created_at ASC
      LIMIT 200
    `
  );
  return rows;
}

export async function listAllListingsAdmin(limit = 300) {
  const p = getPool();
  const { rows } = await p.query(
    `
      SELECT l.id, l.user_id, l.title, l.city, l.price_nzd_week, l.source_url, l.latitude, l.longitude, l.created_at, l.status,
             u.name AS user_name, u.email AS user_email
      FROM listings l
      LEFT JOIN users u ON u.id = l.user_id
      ORDER BY l.created_at DESC
      LIMIT $1
    `,
    [Math.min(Math.max(limit, 1), 1000)]
  );
  return rows;
}

export async function updateListingByAdmin(
  listingId: number,
  input: {
    title?: string;
    city?: string;
    price_nzd_week?: number;
    source_url?: string;
    latitude?: number | null;
    longitude?: number | null;
    status?: 'pending' | 'approved' | 'rejected' | 'paused';
  }
) {
  const p = getPool();

  const sets: string[] = [];
  const params: Array<string | number | null> = [];

  if (typeof input.title === 'string') {
    const v = input.title.trim();
    if (v) {
      params.push(v);
      sets.push(`title=$${params.length}`);
    }
  }

  if (typeof input.city === 'string') {
    const v = input.city.trim();
    if (v) {
      params.push(v);
      sets.push(`city=$${params.length}`);
    }
  }

  if (Number.isFinite(Number(input.price_nzd_week)) && Number(input.price_nzd_week) > 0) {
    params.push(Number(input.price_nzd_week));
    sets.push(`price_nzd_week=$${params.length}`);
  }

  if (typeof input.source_url === 'string') {
    params.push(input.source_url.trim());
    sets.push(`source_url=$${params.length}`);
  }

  if (input.latitude === null) {
    params.push(null);
    sets.push(`latitude=$${params.length}`);
  } else if (Number.isFinite(Number(input.latitude))) {
    params.push(Number(input.latitude));
    sets.push(`latitude=$${params.length}`);
  }

  if (input.longitude === null) {
    params.push(null);
    sets.push(`longitude=$${params.length}`);
  } else if (Number.isFinite(Number(input.longitude))) {
    params.push(Number(input.longitude));
    sets.push(`longitude=$${params.length}`);
  }

  if (input.status && ['pending', 'approved', 'rejected', 'paused'].includes(input.status)) {
    params.push(input.status);
    sets.push(`status=$${params.length}`);
  }

  if (sets.length === 0) return null;

  params.push(listingId);
  const { rows } = await p.query(
    `
      UPDATE listings
      SET ${sets.join(', ')}
      WHERE id=$${params.length}
      RETURNING id, title, city, price_nzd_week, source_url, latitude, longitude, status
    `,
    params
  );

  return rows[0] || null;
}

export async function deleteListingById(listingId: number) {
  const p = getPool();
  const { rows } = await p.query(
    `DELETE FROM listings WHERE id=$1 RETURNING id, title, status`,
    [listingId]
  );
  return rows[0] || null;
}

export async function getListingById(listingId: number) {
  const p = getPool();
  await ensureListingGeoColumns();
  const { rows } = await p.query(
    `
      SELECT l.id, l.user_id, l.title, l.city, l.price_nzd_week, l.source_url, l.image_urls, l.description,
             l.furnished, l.bills_included, l.near_school, l.latitude, l.longitude, l.status, l.created_at, l.expires_at,
             u.name AS user_name, u.email AS user_email
      FROM listings l
      LEFT JOIN users u ON u.id = l.user_id
      WHERE l.id = $1
      LIMIT 1
    `,
    [listingId]
  );
  return rows[0] || null;
}

export async function createSavedSearch(input: SavedSearchInput) {
  const p = getPool();
  const { rows } = await p.query(
    `
      INSERT INTO saved_searches (user_id, name, query, filters_json, active)
      VALUES ($1, $2, $3, $4::jsonb, true)
      RETURNING id, user_id, name, query, filters_json, active, created_at
    `,
    [input.user_id, input.name, input.query, JSON.stringify(input.filters_json || {})]
  );
  return rows[0];
}

export async function listSavedSearches(userId: number) {
  const p = getPool();
  const { rows } = await p.query(
    `SELECT id, name, query, filters_json, active, created_at FROM saved_searches WHERE user_id=$1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

export async function incrementVisitCount() {
  const p = getPool();
  await p.query(`CREATE TABLE IF NOT EXISTS app_metrics (key TEXT PRIMARY KEY, value BIGINT NOT NULL DEFAULT 0)`);
  const { rows } = await p.query(
    `
      INSERT INTO app_metrics (key, value)
      VALUES ('visits_total', 1)
      ON CONFLICT (key) DO UPDATE SET value = app_metrics.value + 1
      RETURNING value
    `
  );
  return Number(rows[0]?.value || 0);
}

export async function getVisitCount() {
  const p = getPool();
  await p.query(`CREATE TABLE IF NOT EXISTS app_metrics (key TEXT PRIMARY KEY, value BIGINT NOT NULL DEFAULT 0)`);
  const { rows } = await p.query(`SELECT value FROM app_metrics WHERE key='visits_total' LIMIT 1`);
  return Number(rows[0]?.value || 0);
}

export async function touchOnlineSession(sessionId: string, windowMinutes = 5) {
  const p = getPool();
  await p.query(
    `
      CREATE TABLE IF NOT EXISTS app_online_presence (
        session_id TEXT PRIMARY KEY,
        last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
  );

  await p.query(
    `
      INSERT INTO app_online_presence (session_id, last_seen)
      VALUES ($1, NOW())
      ON CONFLICT (session_id) DO UPDATE SET last_seen = NOW()
    `,
    [sessionId]
  );

  await p.query(
    `DELETE FROM app_online_presence WHERE last_seen < NOW() - ($1::text || ' minutes')::interval`,
    [String(Math.max(windowMinutes, 1))]
  );

  const { rows } = await p.query(
    `SELECT COUNT(*)::int AS online FROM app_online_presence WHERE last_seen >= NOW() - ($1::text || ' minutes')::interval`,
    [String(Math.max(windowMinutes, 1))]
  );

  return Number(rows[0]?.online || 0);
}

export async function trackEvent(input: {
  event_name: 'listing_created' | 'listing_published' | 'contact_click' | 'share_click' | 'renew_click';
  user_id?: number | null;
  listing_id?: number | null;
  meta?: Record<string, unknown> | null;
}) {
  const p = getPool();
  await p.query(
    `
      CREATE TABLE IF NOT EXISTS app_events (
        id BIGSERIAL PRIMARY KEY,
        event_name TEXT NOT NULL,
        user_id BIGINT NULL,
        listing_id BIGINT NULL,
        meta JSONB NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
  );

  await p.query(
    `
      INSERT INTO app_events (event_name, user_id, listing_id, meta)
      VALUES ($1, $2, $3, $4::jsonb)
    `,
    [input.event_name, input.user_id || null, input.listing_id || null, JSON.stringify(input.meta || null)]
  );
}

export async function getGrowthMetrics(days = 14) {
  const p = getPool();
  const safeDays = Math.min(Math.max(Number(days) || 14, 1), 60);

  await p.query(
    `
      CREATE TABLE IF NOT EXISTS app_events (
        id BIGSERIAL PRIMARY KEY,
        event_name TEXT NOT NULL,
        user_id BIGINT NULL,
        listing_id BIGINT NULL,
        meta JSONB NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
  );

  const { rows: dailyRows } = await p.query(
    `
      SELECT DATE(created_at) AS day, COUNT(*)::int AS listings_new
      FROM listings
      WHERE created_at >= NOW() - ($1::text || ' days')::interval
      GROUP BY 1
      ORDER BY 1 DESC
    `,
    [String(safeDays)]
  );

  const { rows: imageRows } = await p.query(
    `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE COALESCE(array_length(image_urls, 1), 0) > 0)::int AS with_images
      FROM listings
      WHERE created_at >= NOW() - ($1::text || ' days')::interval
    `,
    [String(safeDays)]
  );

  const { rows: contactRows } = await p.query(
    `
      SELECT
        (SELECT COUNT(*)::int FROM listings WHERE created_at >= NOW() - ($1::text || ' days')::interval) AS total_listings,
        (SELECT COUNT(DISTINCT listing_id)::int FROM app_events WHERE event_name='contact_click' AND listing_id IS NOT NULL AND created_at >= NOW() - ($1::text || ' days')::interval) AS listings_with_contact_click
    `,
    [String(safeDays)]
  );

  const { rows: repeatRows } = await p.query(
    `
      WITH poster_counts AS (
        SELECT user_id, COUNT(*)::int AS c
        FROM listings
        WHERE created_at >= NOW() - ($1::text || ' days')::interval
        GROUP BY user_id
      )
      SELECT
        COUNT(*)::int AS unique_posters,
        COUNT(*) FILTER (WHERE c >= 2)::int AS repeat_posters
      FROM poster_counts
    `,
    [String(safeDays)]
  );

  const { rows: eventRows } = await p.query(
    `
      SELECT event_name, COUNT(*)::int AS count
      FROM app_events
      WHERE created_at >= NOW() - ($1::text || ' days')::interval
      GROUP BY event_name
      ORDER BY event_name ASC
    `,
    [String(safeDays)]
  );

  const daily = dailyRows.map((r) => ({ day: String(r.day), listings_new: Number(r.listings_new || 0) }));
  const baselinePerDay = daily.length ? daily.reduce((s, x) => s + x.listings_new, 0) / daily.length : 0;
  const targetPerDay = Math.round((baselinePerDay || 0) * 10);

  const totalListings = Number(contactRows[0]?.total_listings || 0);
  const listingsWithContactClick = Number(contactRows[0]?.listings_with_contact_click || 0);
  const withImages = Number(imageRows[0]?.with_images || 0);
  const imageTotal = Number(imageRows[0]?.total || 0);
  const uniquePosters = Number(repeatRows[0]?.unique_posters || 0);
  const repeatPosters = Number(repeatRows[0]?.repeat_posters || 0);

  return {
    windowDays: safeDays,
    daily,
    baselinePerDay,
    targetPerDay,
    listingWithImagePct: imageTotal > 0 ? (withImages / imageTotal) * 100 : 0,
    listingWithContactClickPct: totalListings > 0 ? (listingsWithContactClick / totalListings) * 100 : 0,
    repeatPosterPct: uniquePosters > 0 ? (repeatPosters / uniquePosters) * 100 : 0,
    eventCounts: eventRows.map((r) => ({ event_name: String(r.event_name), count: Number(r.count || 0) }))
  };
}

export async function listUsersAdmin(limit = 500) {
  const p = getPool();
  const { rows } = await p.query(
    `
      SELECT id, name, email, provider, provider_id, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT $1
    `,
    [Math.min(Math.max(limit, 1), 5000)]
  );
  return rows;
}

export async function deleteUserById(userId: number) {
  const p = getPool();
  const { rows } = await p.query(
    `DELETE FROM users WHERE id=$1 RETURNING id, email, name`,
    [userId]
  );
  return rows[0] || null;
}
