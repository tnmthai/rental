import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';

function isAdmin(email?: string | null) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const p = getPool();
  const { rows } = await p.query(
    `SELECT COUNT(*)::int AS pending_count, MAX(created_at) AS latest_created_at FROM listings WHERE status='pending'`
  );
  return NextResponse.json(rows[0] || { pending_count: 0, latest_created_at: null });
}
