import { Pool } from 'pg';

let pool: Pool | null = null;

export type ListingSearch = {
  city?: string;
  suburb?: string;
  maxPrice?: number;
  furnished?: boolean;
  billsIncluded?: boolean;
  nearSchool?: string;
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
  source_url: string;
  image_urls?: string[];
  description?: string | null;
  furnished?: boolean;
  bills_included?: boolean;
  near_school?: string | null;
  duration_days?: number;
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

  if (filters.city) {
    params.push(`%${filters.city}%`);
    where.push(`city ILIKE $${params.length}`);
  }
  if (filters.suburb) {
    params.push(`%${filters.suburb}%`);
    where.push(`(title ILIKE $${params.length} OR description ILIKE $${params.length})`);
  }
  if (filters.maxPrice) {
    params.push(filters.maxPrice);
    where.push(`price_nzd_week <= $${params.length}`);
  }
  if (filters.furnished === true) {
    where.push('furnished = true');
  }
  if (filters.billsIncluded === true) {
    where.push('bills_included = true');
  }
  if (filters.nearSchool) {
    params.push(`%${filters.nearSchool}%`);
    where.push(`near_school ILIKE $${params.length}`);
  }

  const rankNearSchool = filters.nearSchool ? `CASE WHEN near_school ILIKE '%${filters.nearSchool.replace(/'/g, "''") }%' THEN 0 ELSE 1 END,` : '';
  const rankCity = filters.city ? `CASE WHEN city ILIKE '%${filters.city.replace(/'/g, "''") }%' THEN 0 ELSE 1 END,` : '';

  const sql = `
    SELECT id, user_id, title, city, price_nzd_week, source_url, image_urls, description, furnished, bills_included, near_school, created_at, expires_at
    FROM listings
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY ${rankNearSchool} ${rankCity} price_nzd_week ASC
    LIMIT 12
  `;

  const { rows } = await p.query(sql, params);
  return rows;
}

export async function createListing(input: NewListing) {
  const p = getPool();
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
      input.source_url,
      input.image_urls || [],
      input.description || null,
      Boolean(input.furnished),
      Boolean(input.bills_included),
      input.near_school || null,
      Math.min(Math.max(Number(input.duration_days || 30), 1), 180)
    ]
  );
  return rows[0];
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
    `SELECT id, user_id, title, city, price_nzd_week, created_at FROM listings WHERE status='pending' ORDER BY created_at ASC LIMIT 200`
  );
  return rows;
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
