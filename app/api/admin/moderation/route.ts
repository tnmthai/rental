import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listPendingListings, updateListingStatus } from '@/lib/db';

function isAdmin(email?: string | null) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const items = await listPendingListings();
  return NextResponse.json({ items });
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
