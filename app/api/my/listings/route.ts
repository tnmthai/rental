import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { extendListingExpiry, findUserByEmail, getListingsByUser, updateListingStatus } from '@/lib/db';

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
  const body = await req.json();
  const listingId = Number(body.listing_id || 0);
  if (!listingId) return NextResponse.json({ error: 'listing_id required' }, { status: 400 });

  if (body.action === 'pause') {
    const row = await updateListingStatus(listingId, 'paused');
    return NextResponse.json({ item: row });
  }
  if (body.action === 'resume') {
    const row = await updateListingStatus(listingId, 'approved');
    return NextResponse.json({ item: row });
  }
  if (body.action === 'extend') {
    const row = await extendListingExpiry(listingId, Number(body.days || 7));
    return NextResponse.json({ item: row });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
