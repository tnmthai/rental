import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing');
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

export async function searchListings({ city, maxPrice }: { city?: string; maxPrice?: number }) {
  const p = getPool();
  const params: any[] = [];
  const where: string[] = [];
  if (city) {
    params.push(`%${city}%`);
    where.push(`city ILIKE $${params.length}`);
  }
  if (maxPrice) {
    params.push(maxPrice);
    where.push(`price_nzd_week <= $${params.length}`);
  }
  const sql = `
    SELECT id, title, city, price_nzd_week, source_url
    FROM listings
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY price_nzd_week ASC
    LIMIT 10
  `;
  const { rows } = await p.query(sql, params);
  return rows;
}
