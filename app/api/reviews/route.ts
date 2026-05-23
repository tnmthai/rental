import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addReview, getReviewsByListing, getReviewSummaryByListing } from '@/lib/db';

export async function GET(req: NextRequest) {
  const listingId = Number(req.nextUrl.searchParams.get('listing_id'));
  if (!listingId) return NextResponse.json({ error: 'listing_id required' }, { status: 400 });

  const [reviews, summary] = await Promise.all([
    getReviewsByListing(listingId),
    getReviewSummaryByListing(listingId)
  ]);
  return NextResponse.json({ reviews, summary });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const listingId = Number(body.listing_id);
    const rating = Number(body.rating);
    const comment = typeof body.comment === 'string' ? body.comment.trim() : undefined;

    if (!listingId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'listing_id and rating (1-5) required' }, { status: 400 });
    }

    // Get user id
    const { getPool } = await import('@/lib/db');
    const p = getPool();
    const { rows: users } = await p.query('SELECT id FROM users WHERE email = $1', [session.user.email]);
    if (!users.length) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const review = await addReview(listingId, users[0].id, rating, comment);
    return NextResponse.json({ review });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
