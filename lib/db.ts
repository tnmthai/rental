import { Pool } from 'pg';

let pool: Pool | null = null;

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
};

export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing');
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

export async function searchListings(filters: ListingSearch) {
  const p = getPool();
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
    scoreParts.push(`CASE WHEN city ILIKE $${params.length} THEN 1 ELSE 0 END`);
  }

  if (suburb) {
    params.push(`%${suburb}%`);
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

  const sql = `
    SELECT
      id, user_id, title, city, price_nzd_week, source_url, image_urls, description,
      furnished, bills_included, near_school, created_at, expires_at,
      (${scoreExpr})::int AS match_score,
      ${conditionCount}::int AS condition_count
    FROM listings
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY
      (${scoreExpr}) DESC,
      price_nzd_week ASC,
      created_at DESC
    LIMIT 30
  `;

  const { rows } = await p.query(sql, params);
  return rows;
}

export async function createListing(input: NewListing) {
  const p = getPool();
  const durationDays = Math.min(Math.max(Number(input.duration_days || 30), 1), 180);

  try {
    const { rows } = await p.query(
      `
        INSERT INTO listings (user_id, title, city, price_nzd_week, source_url, image_urls, description, furnished, bills_included, near_school, available_date, expires_at, status)
        VALUES ($1, $2, $3, $4, $5, $6::text[], $7, $8, $9, $10, $11::date, now() + make_interval(days => $12), 'pending')
        RETURNING id, user_id, title, city, price_nzd_week, source_url, image_urls, description, furnished, bills_included, near_school, available_date, created_at, expires_at, status
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
        input.available_date || null,
        durationDays
      ]
    );
    return rows[0];
  } catch (e: any) {
    if (!String(e?.message || '').toLowerCase().includes('available_date')) throw e;

    const { rows } = await p.query(
      `
        INSERT INTO listings (user_id, title, city, price_nzd_week, source_url, image_urls, description, furnished, bills_included, near_school, expires_at, status)
        VALUES ($1, $2, $3, $4, $5, $6::text[], $7, $8, $9, $10, now() + make_interval(days => $11), 'pending')
        RETURNING id, user_id, title, city, price_nzd_week, source_url, image_urls, description, furnished, bills_included, near_school, created_at, expires_at, status
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
        durationDays
      ]
    );
    return rows[0];
  }
}

export async function listRecentListings(limit = 20) {
  const p = getPool();
  const { rows } = await p.query(
    `
      SELECT id, user_id, title, city, price_nzd_week, source_url, image_urls, description, furnished, bills_included, near_school, created_at, expires_at, status
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
      SELECT l.id, l.user_id, l.title, l.city, l.price_nzd_week, l.source_url, l.created_at, l.status,
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
      SELECT l.id, l.user_id, l.title, l.city, l.price_nzd_week, l.source_url, l.created_at, l.status,
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
  const { rows } = await p.query(
    `
      SELECT l.id, l.user_id, l.title, l.city, l.price_nzd_week, l.source_url, l.image_urls, l.description,
             l.furnished, l.bills_included, l.near_school, l.status, l.created_at, l.expires_at,
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
