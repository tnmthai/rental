import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';

function isAdmin(email?: string | null) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const p = getPool();

  // Get all pending listings
  const { rows: pending } = await p.query(
    `SELECT id, title, city FROM listings WHERE status='pending' ORDER BY created_at ASC`
  );

  if (!pending.length) {
    return NextResponse.json({ message: 'No pending listings', approved: 0 });
  }

  // Bulk approve all
  const { rowCount } = await p.query(
    `UPDATE listings SET status='approved' WHERE status='pending'`
  );

  // Track events
  for (const item of pending) {
    await p.query(
      `INSERT INTO app_events (event_name, listing_id, meta) VALUES ('listing_published', $1, '{"source": "bulk_approve"}'::jsonb)`,
      [item.id]
    );
  }

  return NextResponse.json({
    message: `Approved ${rowCount} listings`,
    approved: rowCount,
    listings: pending.map((r: any) => ({ id: r.id, title: r.title, city: r.city }))
  });
}
