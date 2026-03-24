import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createWantedPost, findUserByEmail, listRecentWantedPosts } from '@/lib/db';

export async function GET() {
  const items = await listRecentWantedPosts(40);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await findUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });

  const body = await req.json();
  const title = String(body?.title || '').trim();
  const city = String(body?.city || '').trim();
  const budget = Number(body?.budget_nzd_week || 0);

  if (!title || !city || !Number.isFinite(budget) || budget <= 0) {
    return NextResponse.json({ error: 'title, city, budget_nzd_week are required' }, { status: 400 });
  }

  const item = await createWantedPost({
    user_id: Number(user.id),
    title,
    city,
    budget_nzd_week: budget,
    description: body?.description ? String(body.description).trim() : null,
    furnished: Boolean(body?.furnished),
    bills_included: Boolean(body?.bills_included),
    near_school: body?.near_school ? String(body.near_school).trim() : null,
    available_date: body?.available_date ? String(body.available_date).trim() : null,
    duration_days: Number(body?.duration_days || 30)
  });

  return NextResponse.json({ item }, { status: 201 });
}
