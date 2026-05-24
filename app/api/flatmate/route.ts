import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';

async function ensureFlatmateTable() {
  const p = getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS flatmate_profiles (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      city TEXT,
      budget INT,
      lifestyle TEXT DEFAULT 'balanced',
      schedule TEXT DEFAULT 'flexible',
      cleanliness TEXT DEFAULT 'moderate',
      smoking TEXT DEFAULT 'no',
      pets TEXT DEFAULT 'no',
      about TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(user_id)
    )
  `);
}

export async function GET(req: NextRequest) {
  const p = getPool();
  await ensureFlatmateTable();

  const city = req.nextUrl.searchParams.get('city');
  const budget = Number(req.nextUrl.searchParams.get('budget'));

  let query = `SELECT fp.*, u.name FROM flatmate_profiles fp LEFT JOIN users u ON u.id = fp.user_id WHERE 1=1`;
  const params: any[] = [];

  if (city) {
    params.push(city.toLowerCase());
    query += ` AND LOWER(fp.city) = $${params.length}`;
  }
  if (budget && Number.isFinite(budget)) {
    params.push(budget);
    query += ` AND fp.budget <= $${params.length}`;
  }

  query += ` ORDER BY fp.created_at DESC LIMIT 50`;

  const { rows } = await p.query(query, params);
  return NextResponse.json({ profiles: rows });
}

function sanitizeText(input: unknown, maxLen = 2000): string | null {
  if (typeof input !== 'string') return null;
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .trim()
    .slice(0, maxLen) || null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const p = getPool();
    await ensureFlatmateTable();

    const { rows: users } = await p.query('SELECT id FROM users WHERE email = $1', [session.user.email]);
    if (!users.length) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json();
    const city = sanitizeText(body.city, 100);
    const budget = body.budget ? Number(body.budget) : null;
    const lifestyle = sanitizeText(body.lifestyle, 50);
    const schedule = sanitizeText(body.schedule, 50);
    const cleanliness = sanitizeText(body.cleanliness, 50);
    const smoking = sanitizeText(body.smoking, 20);
    const pets = sanitizeText(body.pets, 20);
    const about = sanitizeText(body.about, 2000);

    await p.query(
      `INSERT INTO flatmate_profiles (user_id, city, budget, lifestyle, schedule, cleanliness, smoking, pets, about)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id) DO UPDATE SET city=$2, budget=$3, lifestyle=$4, schedule=$5, cleanliness=$6, smoking=$7, pets=$8, about=$9`,
      [users[0].id, city, budget && Number.isFinite(budget) && budget > 0 ? budget : null, lifestyle, schedule, cleanliness, smoking, pets, about]
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
