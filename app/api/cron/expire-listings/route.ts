import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const cronSecret = process.env.CRON_SECRET || '';

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const p = getPool();
  const { rows } = await p.query(
    `UPDATE listings SET status = 'expired'
     WHERE expires_at < now() AND status = 'approved'
     RETURNING id, title, city`
  );

  return NextResponse.json({
    expired_count: rows.length,
    expired: rows.map((r: any) => ({ id: r.id, title: r.title, city: r.city }))
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
