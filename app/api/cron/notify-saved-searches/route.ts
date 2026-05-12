import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const cronSecret = process.env.CRON_SECRET || '';

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const p = getPool();

  // Ensure tables exist
  await p.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'listing_match',
      title TEXT NOT NULL,
      body TEXT,
      read BOOLEAN NOT NULL DEFAULT FALSE,
      listing_id BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Find new approved listings from the last 24 hours
  const { rows: newListings } = await p.query(`
    SELECT id, title, city, price_nzd_week, furnished, bills_included, near_school
    FROM listings
    WHERE status = 'approved'
      AND created_at >= now() - interval '24 hours'
    ORDER BY created_at DESC
    LIMIT 100
  `);

  if (newListings.length === 0) {
    return NextResponse.json({ message: 'No new listings', notifications_created: 0 });
  }

  // Get all active saved searches
  const { rows: savedSearches } = await p.query(`
    SELECT ss.id, ss.user_id, ss.name, ss.query, ss.filters_json
    FROM saved_searches ss
    WHERE ss.active = TRUE
    ORDER BY ss.created_at DESC
    LIMIT 500
  `);

  let notificationsCreated = 0;

  for (const search of savedSearches) {
    const query = String(search.query || '').toLowerCase();
    const filters = (search.filters_json && typeof search.filters_json === 'object') ? search.filters_json as Record<string, unknown> : {};

    for (const listing of newListings) {
      const title = String(listing.title || '').toLowerCase();
      const city = String(listing.city || '').toLowerCase();
      const desc = `${title} ${city}`;

      // Simple keyword match
      const matches = query.split(/\s+/).some((word: string) => {
        const w = word.trim();
        return w.length >= 2 && desc.includes(w);
      });

      if (!matches) continue;

      // Check if notification already exists
      const { rows: existing } = await p.query(
        `SELECT id FROM notifications WHERE user_id=$1 AND listing_id=$2 AND type='listing_match' LIMIT 1`,
        [search.user_id, listing.id]
      );

      if (existing.length > 0) continue;

      // Create notification
      await p.query(
        `INSERT INTO notifications (user_id, type, title, body, listing_id) VALUES ($1, 'listing_match', $2, $3, $4)`,
        [
          search.user_id,
          `New listing matches "${search.name}"`,
          `${listing.title} in ${listing.city} - $${listing.price_nzd_week}/week`,
          listing.id
        ]
      );
      notificationsCreated++;
    }
  }

  return NextResponse.json({
    new_listings_checked: newListings.length,
    saved_searches_checked: savedSearches.length,
    notifications_created: notificationsCreated
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
