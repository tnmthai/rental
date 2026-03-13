import { Pool } from 'pg';

let pool: Pool | null = null;

export type ListingSearch = {
  city?: string;
  maxPrice?: number;
  furnished?: boolean;
  billsIncluded?: boolean;
  nearSchool?: string;
};

export type NewListing = {
  title: string;
  city: string;
  price_nzd_week: number;
  source_url: string;
  image_urls?: string[];
  description?: string | null;
  furnished?: boolean;
  bills_included?: boolean;
  near_school?: string | null;
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
  const where: string[] = [];

  if (filters.city) {
    params.push(`%${filters.city}%`);
    where.push(`city ILIKE $${params.length}`);
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

  const sql = `
    SELECT id, title, city, price_nzd_week, source_url, image_urls, description, furnished, bills_included, near_school
    FROM listings
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY price_nzd_week ASC
    LIMIT 12
  `;

  const { rows } = await p.query(sql, params);
  return rows;
}

export async function createListing(input: NewListing) {
  const p = getPool();
  const { rows } = await p.query(
    `
      INSERT INTO listings (title, city, price_nzd_week, source_url, image_urls, description, furnished, bills_included, near_school)
      VALUES ($1, $2, $3, $4, $5::text[], $6, $7, $8, $9)
      RETURNING id, title, city, price_nzd_week, source_url, image_urls, description, furnished, bills_included, near_school, created_at
    `,
    [
      input.title,
      input.city,
      input.price_nzd_week,
      input.source_url,
      input.image_urls || [],
      input.description || null,
      Boolean(input.furnished),
      Boolean(input.bills_included),
      input.near_school || null
    ]
  );
  return rows[0];
}

export async function listRecentListings(limit = 20) {
  const p = getPool();
  const { rows } = await p.query(
    `
      SELECT id, title, city, price_nzd_week, source_url, image_urls, description, furnished, bills_included, near_school, created_at
      FROM listings
      ORDER BY created_at DESC
      LIMIT $1
    `,
    [Math.min(Math.max(limit, 1), 100)]
  );
  return rows;
}
