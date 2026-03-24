import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findUserByEmail, getWantedPostsByUser, updateWantedPostStatus } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await findUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });

  const items = await getWantedPostsByUser(Number(user.id));
  return NextResponse.json({ items });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const wantedId = Number(body.wanted_id || 0);
  const action = String(body.action || '');
  if (!wantedId) return NextResponse.json({ error: 'wanted_id required' }, { status: 400 });

  if (action === 'pause') {
    const item = await updateWantedPostStatus(wantedId, 'paused');
    return NextResponse.json({ item });
  }
  if (action === 'resume') {
    const item = await updateWantedPostStatus(wantedId, 'approved');
    return NextResponse.json({ item });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
