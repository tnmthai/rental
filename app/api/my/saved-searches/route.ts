import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createSavedSearch, findUserByEmail, listSavedSearches } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await findUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });
  const items = await listSavedSearches(Number(user.id));
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await findUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });
  const body = await req.json();
  const name = String(body.name || '').trim() || 'Saved search';
  const query = String(body.query || '').trim();
  if (!query) return NextResponse.json({ error: 'query required' }, { status: 400 });
  const item = await createSavedSearch({ user_id: Number(user.id), name, query, filters_json: body.filters || {} });
  return NextResponse.json({ item }, { status: 201 });
}
