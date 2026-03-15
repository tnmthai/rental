import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deleteListingById, findUserByEmail, listAllListingsAdmin, listPendingListings, trackEvent, updateListingByAdmin, updateListingStatus } from '@/lib/db';

function isAdmin(email?: string | null) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const scope = req.nextUrl.searchParams.get('scope') || 'pending';
  const items = scope === 'all' ? await listAllListingsAdmin(500) : await listPendingListings();
  return NextResponse.json({ items, scope });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const listingId = Number(body.listing_id || 0);
  const action = String(body.action || '');

  if (!listingId) {
    return NextResponse.json({ error: 'listing_id required' }, { status: 400 });
  }

  if (action === 'update') {
    const item = await updateListingByAdmin(listingId, {
      title: typeof body.title === 'string' ? body.title : undefined,
      city: typeof body.city === 'string' ? body.city : undefined,
      price_nzd_week: body.price_nzd_week,
      source_url: typeof body.source_url === 'string' ? body.source_url : undefined,
      latitude: body.latitude === null || body.latitude === '' ? null : body.latitude,
      longitude: body.longitude === null || body.longitude === '' ? null : body.longitude,
      status: typeof body.status === 'string' ? body.status : undefined
    });

    if (!item) return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    return NextResponse.json({ item });
  }

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'action must be approve, reject, or update' }, { status: 400 });
  }

  const item = await updateListingStatus(listingId, action === 'approve' ? 'approved' : 'rejected');

  if (action === 'approve' && item?.id) {
    const adminUser = session?.user?.email ? await findUserByEmail(session.user.email) : null;
    await trackEvent({
      event_name: 'listing_published',
      user_id: adminUser?.id ? Number(adminUser.id) : null,
      listing_id: Number(item.id),
      meta: { source: 'admin_moderation' }
    });
  }

  return NextResponse.json({ item });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const listingId = Number(body.listing_id || 0);
  if (!listingId) {
    return NextResponse.json({ error: 'listing_id required' }, { status: 400 });
  }

  const deleted = await deleteListingById(listingId);
  if (!deleted) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  return NextResponse.json({ item: deleted });
}
