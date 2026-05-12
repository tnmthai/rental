import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addFavorite, removeFavorite, getFavoritesByUser, isFavorited, findUserByEmail } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await findUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });
  const items = await getFavoritesByUser(Number(user.id));
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await findUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });
  const body = await req.json();
  const listingId = Number(body.listing_id || 0);
  if (!listingId) return NextResponse.json({ error: 'listing_id required' }, { status: 400 });
  const item = await addFavorite(Number(user.id), listingId);
  return NextResponse.json({ item }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await findUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });
  const body = await req.json();
  const listingId = Number(body.listing_id || 0);
  if (!listingId) return NextResponse.json({ error: 'listing_id required' }, { status: 400 });
  await removeFavorite(Number(user.id), listingId);
  return NextResponse.json({ ok: true });
}
