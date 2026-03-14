import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deleteListingById, listAllListingsAdmin, listPendingListings, updateListingStatus } from '@/lib/db';

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
  if (!listingId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'listing_id and action required' }, { status: 400 });
  }
  const item = await updateListingStatus(listingId, action === 'approve' ? 'approved' : 'rejected');
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
