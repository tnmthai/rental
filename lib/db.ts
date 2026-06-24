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
  await ensureFeaturedColumns();
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
    where.push(`near_school ILIKE $${params.length}`);
    scoreParts.push(`CASE WHEN near_school ILIKE $${params.length} THEN 1 ELSE 0 END`);
  }

  const conditionCount = scoreParts.length;
  const scoreExpr = conditionCount > 0 ? scoreParts.join(' + ') : '0';

  // If user gave at least one condition, only show rows that satisfy >= 1 condition.
  if (conditionCount > 0) {
    where.push(`(${scoreExpr}) >= 1`);
  }

  const orderBy = conditionCount > 0
    ? `(CASE WHEN l.is_featured = true AND (l.featured_until IS NULL OR l.featured_until > now()) THEN 1 ELSE 0 END) DESC, (${scoreExpr}) DESC, price_nzd_week ASC, l.created_at DESC`
    : `(CASE WHEN l.is_featured = true AND (l.featured_until IS NULL OR l.featured_until > now()) THEN 1 ELSE 0 END) DESC, price_nzd_week ASC, l.created_at DESC`;

  const sql = `
    SELECT
      l.id, l.user_id, l.title, l.city, l.price_nzd_week, l.source_url, l.image_urls, l.description,
      l.furnished, l.bills_included, l.near_school, l.latitude, l.longitude, l.created_at, l.expires_at,
      (${scoreExpr})::int AS match_score,
      ${conditionCount}::int AS condition_count,
      (l.is_featured = true AND (l.featured_until IS NULL OR l.featured_until > now())) AS is_featured,
      u.is_verified AS user_verified
    FROM listings l
    LEFT JOIN users u ON u.id = l.user_id
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

export async function getListingsWithCoords() {
  const p = getPool();
  await ensureListingGeoColumns();
  const { rows } = await p.query(
    `SELECT id, title, city, price_nzd_week, latitude, longitude
     FROM listings
     WHERE status = 'approved'
       AND (expires_at IS NULL OR expires_at > now())
       AND latitude IS NOT NULL
       AND longitude IS NOT NULL
     ORDER BY created_at DESC
     LIMIT 500`
  );
  return rows;
}

export async function listRecentListings(limit = 20) {
  const p = getPool();
  await ensureListingGeoColumns();
  await ensureFeaturedColumns();
  await ensureVerifiedColumn();
  const { rows } = await p.query(
    `
      SELECT l.id, l.user_id, l.title, l.city, l.price_nzd_week, l.source_url, l.image_urls, l.description,
             l.furnished, l.bills_included, l.near_school, l.latitude, l.longitude, l.created_at, l.expires_at, l.status,
             (l.is_featured = true AND (l.featured_until IS NULL OR l.featured_until > now())) AS is_featured,
             u.is_verified AS user_verified
      FROM listings l
      LEFT JOIN users u ON u.id = l.user_id
      ORDER BY (l.is_featured = true AND (l.featured_until IS NULL OR l.featured_until > now())) DESC, l.created_at DESC
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
  await ensureModerationNoteColumn();
  const { rows } = await p.query(
    `SELECT id, title, city, price_nzd_week, status, created_at, expires_at, moderation_note FROM listings WHERE user_id=$1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

export async function updateListingStatus(listingId: number, status: 'approved' | 'rejected' | 'paused' | 'pending', moderationNote?: string) {
  const p = getPool();
  await ensureModerationNoteColumn();
  if (moderationNote !== undefined) {
    const { rows } = await p.query(
      `UPDATE listings SET status=$1, moderation_note=$3 WHERE id=$2 RETURNING id, status, moderation_note`,
      [status, listingId, moderationNote || null]
    );
    return rows[0] || null;
  }
  const { rows } = await p.query(
    `UPDATE listings SET status=$1 WHERE id=$2 RETURNING id, status`,
    [status, listingId]
  );
  return rows[0] || null;
}

export async function approveAllPending() {
  const p = getPool();
  const { rowCount } = await p.query(
    `UPDATE listings SET status='approved' WHERE status='pending'`
  );
  return rowCount || 0;
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
  await ensureModerationNoteColumn();
  await ensureFeaturedColumns();
  await ensureVerifiedColumn();
  const { rows } = await p.query(
    `
      SELECT l.id, l.user_id, l.title, l.city, l.price_nzd_week, l.source_url, l.image_urls, l.description,
             l.furnished, l.bills_included, l.near_school, l.latitude, l.longitude, l.status, l.created_at, l.expires_at,
             l.moderation_note, l.is_featured, l.featured_until,
             u.name AS user_name, u.email AS user_email, u.is_verified AS user_verified
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
  event_name: 'listing_created' | 'listing_published' | 'contact_click' | 'share_click' | 'renew_click' | 'boost_listing';
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
  await ensureVerifiedColumn();
  const { rows } = await p.query(
    `
      SELECT id, name, email, provider, provider_id, is_verified, created_at
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

// ── Featured / Boost ─────────────────────────────────────────────────────────

export async function setListingFeatured(listingId: number, featured: boolean, featuredUntil?: string | null) {
  const p = getPool();
  await ensureFeaturedColumns();
  if (featured) {
    const { rows } = await p.query(
      `UPDATE listings SET is_featured = true, featured_until = $2 WHERE id = $1 RETURNING id, is_featured, featured_until`,
      [listingId, featuredUntil ? featuredUntil : null]
    );
    return rows[0] || null;
  } else {
    const { rows } = await p.query(
      `UPDATE listings SET is_featured = false, featured_until = NULL WHERE id = $1 RETURNING id, is_featured, featured_until`,
      [listingId]
    );
    return rows[0] || null;
  }
}

export async function listFeaturedListings(limit = 10) {
  const p = getPool();
  await ensureFeaturedColumns();
  await ensureVerifiedColumn();
  const { rows } = await p.query(
    `
      SELECT l.id, l.user_id, l.title, l.city, l.price_nzd_week, l.source_url, l.image_urls, l.description,
             l.furnished, l.bills_included, l.near_school, l.latitude, l.longitude, l.created_at, l.expires_at, l.status,
             l.is_featured, l.featured_until,
             u.is_verified AS user_verified
      FROM listings l
      LEFT JOIN users u ON u.id = l.user_id
      WHERE l.status = 'approved'
        AND l.is_featured = true
        AND (l.featured_until IS NULL OR l.featured_until > now())
        AND (l.expires_at IS NULL OR l.expires_at > now())
      ORDER BY l.created_at DESC
      LIMIT $1
    `,
    [Math.min(Math.max(limit, 1), 50)]
  );
  return rows;
}

// ── Verified Badge ───────────────────────────────────────────────────────────

export async function setUserVerified(userId: number, verified: boolean) {
  const p = getPool();
  await ensureVerifiedColumn();
  const { rows } = await p.query(
    `UPDATE users SET is_verified = $2 WHERE id = $1 RETURNING id, name, email, is_verified`,
    [userId, verified]
  );
  return rows[0] || null;
}

export async function getUserById(userId: number) {
  const p = getPool();
  await ensureVerifiedColumn();
  await ensurePremiumColumn();
  const { rows } = await p.query(
    `SELECT id, name, email, provider, provider_id, is_verified, plan, plan_expires_at, created_at FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

export async function getUserPlan(userId: number): Promise<{ plan: string; expires_at: string | null }> {
  const p = getPool();
  await ensurePremiumColumn();
  const { rows } = await p.query('SELECT plan, plan_expires_at FROM users WHERE id = $1', [userId]);
  if (!rows.length) return { plan: 'free', expires_at: null };
  const r = rows[0];
  if (r.plan !== 'free' && r.plan_expires_at && new Date(r.plan_expires_at) < new Date()) {
    await p.query('UPDATE users SET plan = $1, plan_expires_at = NULL WHERE id = $2', ['free', userId]);
    return { plan: 'free', expires_at: null };
  }
  return { plan: r.plan || 'free', expires_at: r.plan_expires_at };
}

export async function setUserPlan(userId: number, plan: string, expiresAt: string) {
  const p = getPool();
  await ensurePremiumColumn();
  const { rows } = await p.query(
    'UPDATE users SET plan = $1, plan_expires_at = $2 WHERE id = $3 RETURNING id, plan, plan_expires_at',
    [plan, expiresAt, userId]
  );
  return rows[0] || null;
}

export type NewWantedPost = {
  user_id: number;
  title: string;
  city: string;
  budget_nzd_week: number;
  description?: string | null;
  furnished?: boolean;
  bills_included?: boolean;
  near_school?: string | null;
  available_date?: string | null;
  duration_days?: number;
};

async function ensureWantedPostsTable() {
  const p = getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS wanted_posts (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      city TEXT NOT NULL,
      budget_nzd_week INTEGER NOT NULL,
      description TEXT,
      furnished BOOLEAN NOT NULL DEFAULT FALSE,
      bills_included BOOLEAN NOT NULL DEFAULT FALSE,
      near_school TEXT,
      available_date DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'approved'
    )
  `);
}

export async function createWantedPost(input: NewWantedPost) {
  const p = getPool();
  await ensureWantedPostsTable();
  const durationDays = Math.min(Math.max(Number(input.duration_days || 30), 1), 180);

  const { rows } = await p.query(
    `
      INSERT INTO wanted_posts (
        user_id, title, city, budget_nzd_week, description,
        furnished, bills_included, near_school, available_date, expires_at, status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::date, now() + make_interval(days => $10), 'approved')
      RETURNING id, user_id, title, city, budget_nzd_week, description,
                furnished, bills_included, near_school, available_date, created_at, expires_at, status
    `,
    [
      input.user_id,
      input.title,
      input.city,
      input.budget_nzd_week,
      input.description || null,
      Boolean(input.furnished),
      Boolean(input.bills_included),
      input.near_school || null,
      input.available_date || null,
      durationDays
    ]
  );

  return rows[0];
}

export async function listRecentWantedPosts(limit = 30) {
  const p = getPool();
  await ensureWantedPostsTable();
  const { rows } = await p.query(
    `
      SELECT w.id, w.user_id, w.title, w.city, w.budget_nzd_week, w.description,
             w.furnished, w.bills_included, w.near_school, w.available_date, w.created_at, w.expires_at, w.status,
             u.name AS contact_name, u.email AS contact_email
      FROM wanted_posts w
      LEFT JOIN users u ON u.id = w.user_id
      WHERE w.status='approved' AND (w.expires_at IS NULL OR w.expires_at > now())
      ORDER BY w.created_at DESC
      LIMIT $1
    `,
    [Math.min(Math.max(limit, 1), 200)]
  );
  return rows;
}

export async function searchWantedPosts(filters: ListingSearch, limit = 30) {
  const p = getPool();
  await ensureWantedPostsTable();
  const params: Array<string | number | boolean> = [];
  const where: string[] = ["w.status='approved'", '(w.expires_at IS NULL OR w.expires_at > now())'];

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

  if (city) {
    params.push(`%${city}%`);
    where.push(`w.city ILIKE $${params.length}`);
  }
  if (suburb) {
    params.push(`%${suburb}%`);
    where.push(`(w.title ILIKE $${params.length} OR w.description ILIKE $${params.length} OR w.city ILIKE $${params.length})`);
  }
  if (maxPrice) {
    params.push(maxPrice);
    where.push(`w.budget_nzd_week <= $${params.length}`);
  }
  if (typeof filters.furnished === 'boolean') {
    params.push(filters.furnished);
    where.push(`w.furnished = $${params.length}`);
  }
  if (typeof filters.billsIncluded === 'boolean') {
    params.push(filters.billsIncluded);
    where.push(`w.bills_included = $${params.length}`);
  }
  if (nearSchool) {
    params.push(`%${nearSchool}%`);
    where.push(`w.near_school ILIKE $${params.length}`);
  }

  params.push(Math.min(Math.max(limit, 1), 200));
  const { rows } = await p.query(
    `
      SELECT w.id, w.user_id, w.title, w.city, w.budget_nzd_week, w.description,
             w.furnished, w.bills_included, w.near_school, w.available_date, w.created_at, w.expires_at, w.status,
             u.name AS contact_name, u.email AS contact_email
      FROM wanted_posts w
      LEFT JOIN users u ON u.id = w.user_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY w.created_at DESC
      LIMIT $${params.length}
    `,
    params
  );
  return rows;
}

async function ensureFavoritesTable() {
  const p = getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS favorites (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      listing_id BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(user_id, listing_id)
    )
  `);
}

async function ensureModerationNoteColumn() {
  const p = getPool();
  await p.query(`ALTER TABLE listings ADD COLUMN IF NOT EXISTS moderation_note TEXT`);
}

async function ensureFeaturedColumns() {
  const p = getPool();
  await p.query(`ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE`);
  await p.query(`ALTER TABLE listings ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ`);
}

async function ensureVerifiedColumn() {
  const p = getPool();
  await p.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE`);
}

async function ensurePremiumColumn() {
  const p = getPool();
  await p.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'`);
  await p.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ`);
}

async function ensureNotificationsTable() {
  const p = getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'listing_match',
      title TEXT NOT NULL,
      body TEXT,
      read BOOLEAN NOT NULL DEFAULT FALSE,
      listing_id BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

export async function createNotification(userId: number, type: string, title: string, body?: string, listingId?: number) {
  const p = getPool();
  await ensureNotificationsTable();
  const { rows } = await p.query(
    `INSERT INTO notifications (user_id, type, title, body, listing_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, user_id, type, title, body, read, listing_id, created_at`,
    [userId, type, title, body || null, listingId || null]
  );
  return rows[0];
}

export async function getNotificationsByUser(userId: number, limit = 50) {
  const p = getPool();
  await ensureNotificationsTable();
  const { rows } = await p.query(
    `SELECT id, type, title, body, read, listing_id, created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2`,
    [userId, Math.min(Math.max(limit, 1), 200)]
  );
  return rows;
}

export async function getUnreadNotificationCount(userId: number) {
  const p = getPool();
  await ensureNotificationsTable();
  const { rows } = await p.query(
    `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id=$1 AND read=FALSE`,
    [userId]
  );
  return Number(rows[0]?.count || 0);
}

export async function markNotificationsRead(userId: number, notificationIds?: number[]) {
  const p = getPool();
  await ensureNotificationsTable();
  if (notificationIds && notificationIds.length > 0) {
    await p.query(
      `UPDATE notifications SET read=TRUE WHERE user_id=$1 AND id = ANY($2)`,
      [userId, notificationIds]
    );
  } else {
    await p.query(
      `UPDATE notifications SET read=TRUE WHERE user_id=$1 AND read=FALSE`,
      [userId]
    );
  }
}

export async function addFavorite(userId: number, listingId: number) {
  const p = getPool();
  await ensureFavoritesTable();
  const { rows } = await p.query(
    `INSERT INTO favorites (user_id, listing_id) VALUES ($1, $2)
     ON CONFLICT (user_id, listing_id) DO NOTHING
     RETURNING id, user_id, listing_id, created_at`,
    [userId, listingId]
  );
  return rows[0] || { user_id: userId, listing_id: listingId };
}

export async function removeFavorite(userId: number, listingId: number) {
  const p = getPool();
  await ensureFavoritesTable();
  const { rows } = await p.query(
    `DELETE FROM favorites WHERE user_id=$1 AND listing_id=$2 RETURNING id`,
    [userId, listingId]
  );
  return rows[0] || null;
}

export async function getFavoritesByUser(userId: number) {
  const p = getPool();
  await ensureFavoritesTable();
  const { rows } = await p.query(
    `SELECT f.id, f.listing_id, f.created_at,
            l.title, l.city, l.price_nzd_week, l.image_urls, l.status, l.source_url
     FROM favorites f
     JOIN listings l ON l.id = f.listing_id
     WHERE f.user_id=$1
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function isFavorited(userId: number, listingId: number) {
  const p = getPool();
  await ensureFavoritesTable();
  const { rows } = await p.query(
    `SELECT id FROM favorites WHERE user_id=$1 AND listing_id=$2 LIMIT 1`,
    [userId, listingId]
  );
  return rows.length > 0;
}

export async function getWantedPostsByUser(userId: number) {
  const p = getPool();
  await ensureWantedPostsTable();
  const { rows } = await p.query(
    `
      SELECT id, user_id, title, city, budget_nzd_week, description,
             furnished, bills_included, near_school, available_date, created_at, expires_at, status
      FROM wanted_posts
      WHERE user_id=$1
      ORDER BY created_at DESC
    `,
    [userId]
  );
  return rows;
}

export async function listPendingWantedPosts(limit = 300) {
  const p = getPool();
  await ensureWantedPostsTable();
  const { rows } = await p.query(
    `
      SELECT w.id, w.user_id, w.title, w.city, w.budget_nzd_week, w.description,
             w.furnished, w.bills_included, w.near_school, w.available_date,
             w.created_at, w.expires_at, w.status,
             u.name AS user_name, u.email AS user_email
      FROM wanted_posts w
      LEFT JOIN users u ON u.id = w.user_id
      WHERE w.status='pending'
      ORDER BY w.created_at ASC
      LIMIT $1
    `,
    [Math.min(Math.max(limit, 1), 1000)]
  );
  return rows;
}

export async function listAllWantedPostsAdmin(limit = 500) {
  const p = getPool();
  await ensureWantedPostsTable();
  const { rows } = await p.query(
    `
      SELECT w.id, w.user_id, w.title, w.city, w.budget_nzd_week, w.description,
             w.furnished, w.bills_included, w.near_school, w.available_date,
             w.created_at, w.expires_at, w.status,
             u.name AS user_name, u.email AS user_email
      FROM wanted_posts w
      LEFT JOIN users u ON u.id = w.user_id
      ORDER BY w.created_at DESC
      LIMIT $1
    `,
    [Math.min(Math.max(limit, 1), 1000)]
  );
  return rows;
}

export async function updateWantedPostStatus(wantedId: number, status: 'approved' | 'rejected' | 'paused' | 'pending') {
  const p = getPool();
  await ensureWantedPostsTable();
  const { rows } = await p.query(`UPDATE wanted_posts SET status=$1 WHERE id=$2 RETURNING id, status`, [status, wantedId]);
  return rows[0] || null;
}

export async function deleteWantedPostById(wantedId: number) {
  const p = getPool();
  await ensureWantedPostsTable();
  const { rows } = await p.query(`DELETE FROM wanted_posts WHERE id=$1 RETURNING id, title`, [wantedId]);
  return rows[0] || null;
}

// ============ Reviews ============

async function ensureReviewsTable() {
  const p = getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id BIGSERIAL PRIMARY KEY,
      listing_id BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(listing_id, user_id)
    )
  `);
}

export async function addReview(listingId: number, userId: number, rating: number, comment?: string) {
  const p = getPool();
  await ensureReviewsTable();
  const { rows } = await p.query(
    `INSERT INTO reviews (listing_id, user_id, rating, comment) VALUES ($1, $2, $3, $4)
     ON CONFLICT (listing_id, user_id) DO UPDATE SET rating = $3, comment = $4, created_at = now()
     RETURNING id, listing_id, user_id, rating, comment, created_at`,
    [listingId, userId, Math.min(5, Math.max(1, Math.round(rating))), comment || null]
  );
  return rows[0];
}

export async function getReviewsByListing(listingId: number) {
  const p = getPool();
  await ensureReviewsTable();
  const { rows } = await p.query(
    `SELECT r.id, r.rating, r.comment, r.created_at, u.name AS user_name
     FROM reviews r LEFT JOIN users u ON u.id = r.user_id
     WHERE r.listing_id = $1 ORDER BY r.created_at DESC`,
    [listingId]
  );
  return rows;
}

export async function getReviewSummaryByListing(listingId: number) {
  const p = getPool();
  await ensureReviewsTable();
  const { rows } = await p.query(
    `SELECT COUNT(*)::int AS count, ROUND(AVG(rating), 1)::float AS avg_rating
     FROM reviews WHERE listing_id = $1`,
    [listingId]
  );
  return rows[0] || { count: 0, avg_rating: null };
}
