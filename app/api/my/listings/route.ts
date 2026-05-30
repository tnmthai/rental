import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { extendListingExpiry, findUserByEmail, getListingsByUser, setListingFeatured, trackEvent, updateListingStatus } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await findUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });
  const items = await getListingsByUser(Number(user.id));
  return NextResponse.json({ items });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await findUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });

  const body = await req.json();
  const listingId = Number(body.listing_id || 0);
  if (!listingId) return NextResponse.json({ error: 'listing_id required' }, { status: 400 });

  if (body.action === 'pause') {
    const row = await updateListingStatus(listingId, 'paused');
    return NextResponse.json({ item: row });
  }
  if (body.action === 'resume') {
    const row = await updateListingStatus(listingId, 'approved');
    await trackEvent({
      event_name: 'listing_published',
      user_id: Number(user.id),
      listing_id: listingId,
      meta: { source: 'user_resume' }
    });
    return NextResponse.json({ item: row });
  }
  if (body.action === 'extend') {
    const row = await extendListingExpiry(listingId, Number(body.days || 7));
    await trackEvent({ event_name: 'renew_click', user_id: Number(user.id), listing_id: listingId });
    return NextResponse.json({ item: row });
  }
  if (body.action === 'renew') {
    await updateListingStatus(listingId, 'pending');
    const row = await extendListingExpiry(listingId, Number(body.days || 30));
    await trackEvent({ event_name: 'renew_click', user_id: Number(user.id), listing_id: listingId });
    return NextResponse.json({ item: row });
  }
  if (body.action === 'boost') {
    const days = Number(body.days || 7);
    const featuredUntil = new Date(Date.now() + days * 86_400_000).toISOString();
    const row = await setListingFeatured(listingId, true, featuredUntil);
    await trackEvent({ event_name: 'boost_listing', user_id: Number(user.id), listing_id: listingId, meta: { days, free: true } });
    return NextResponse.json({ item: row });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
