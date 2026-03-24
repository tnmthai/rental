import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deleteWantedPostById, listAllWantedPostsAdmin, listPendingWantedPosts, updateWantedPostStatus } from '@/lib/db';

function isAdmin(email?: string | null) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const scope = req.nextUrl.searchParams.get('scope') || 'pending';
  const items = scope === 'all' ? await listAllWantedPostsAdmin(500) : await listPendingWantedPosts(300);
  return NextResponse.json({ items, scope });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();

  const wantedId = Number(body.wanted_id || 0);
  const action = String(body.action || '');
  if (!wantedId) return NextResponse.json({ error: 'wanted_id required' }, { status: 400 });
  if (!['approve', 'reject', 'pause'].includes(action)) return NextResponse.json({ error: 'invalid action' }, { status: 400 });

  const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'paused';
  const item = await updateWantedPostStatus(wantedId, status);
  return NextResponse.json({ item });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const wantedId = Number(body.wanted_id || 0);
  if (!wantedId) return NextResponse.json({ error: 'wanted_id required' }, { status: 400 });

  const item = await deleteWantedPostById(wantedId);
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ item });
}
