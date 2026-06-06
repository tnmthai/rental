import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';

function isAdmin(email?: string | null) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const days = Number(req.nextUrl.searchParams.get('days') || 14);
  const safeDays = Math.min(Math.max(days, 1), 60);

  const p = getPool();
  const { rows } = await p.query(
    `
      SELECT
        e.id,
        e.listing_id,
        e.meta->>'platform' AS platform,
        e.created_at,
        l.title AS listing_title,
        l.city
      FROM app_events e
      LEFT JOIN listings l ON l.id = e.listing_id
      WHERE e.event_name = 'share_click'
        AND e.created_at >= NOW() - ($1::text || ' days')::interval
      ORDER BY e.created_at DESC
    `,
    [String(safeDays)]
  );

  return NextResponse.json({ data: rows, total: rows.length });
}
