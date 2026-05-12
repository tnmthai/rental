import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findUserByEmail, getNotificationsByUser, getUnreadNotificationCount, markNotificationsRead } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await findUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });
  const items = await getNotificationsByUser(Number(user.id));
  const unreadCount = await getUnreadNotificationCount(Number(user.id));
  return NextResponse.json({ items, unread_count: unreadCount });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await findUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });
  const body = await req.json();
  const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Boolean) : undefined;
  await markNotificationsRead(Number(user.id), ids);
  return NextResponse.json({ ok: true });
}
