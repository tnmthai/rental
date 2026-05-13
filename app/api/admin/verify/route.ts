import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { setUserVerified } from '@/lib/db';

function isAdmin(email?: string | null) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const userId = Number(body.user_id || 0);
  const verified = Boolean(body.verified);

  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

  const result = await setUserVerified(userId, verified);
  if (!result) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({ item: result });
}
