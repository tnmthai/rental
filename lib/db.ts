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
  const where: string[] = ['(expires_at IS NULL OR expires_at > now())'];

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
      INSERT INTO listings (user_id, title, city, price_nzd_week, source_url, image_urls, description, furnished, bills_included, near_school, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6::text[], $7, $8, $9, $10, now() + make_interval(days => $11))
      RETURNING id, user_id, title, city, price_nzd_week, source_url, image_urls, description, furnished, bills_included, near_school, created_at, expires_at
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
      SELECT id, user_id, title, city, price_nzd_week, source_url, image_urls, description, furnished, bills_included, near_school, created_at, expires_at
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
