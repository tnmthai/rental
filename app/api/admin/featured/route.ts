import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { setListingFeatured } from '@/lib/db';

function isAdmin(email?: string | null) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const listingId = Number(body.listing_id || 0);
  const featured = Boolean(body.featured);
  const featuredUntil = body.featured_until ? String(body.featured_until).trim() : null;

  if (!listingId) return NextResponse.json({ error: 'listing_id required' }, { status: 400 });

  const result = await setListingFeatured(listingId, featured, featuredUntil);
  if (!result) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

  return NextResponse.json({ item: result });
}
