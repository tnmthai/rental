import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findUserByEmail, trackEvent } from '@/lib/db';

const allowed = new Set(['listing_created', 'listing_published', 'contact_click', 'share_click', 'renew_click']);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const eventName = String(body?.event_name || '').trim();
    if (!allowed.has(eventName)) {
      return NextResponse.json({ error: 'Invalid event_name' }, { status: 400 });
    }

    const listingId = Number(body?.listing_id || 0) || null;
    const session = await getServerSession(authOptions);
    let userId: number | null = null;
    if (session?.user?.email) {
      const user = await findUserByEmail(session.user.email);
      if (user?.id) userId = Number(user.id);
    }

    await trackEvent({
      event_name: eventName as any,
      user_id: userId,
      listing_id: listingId,
      meta: body?.meta && typeof body.meta === 'object' ? body.meta : null
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to track event' }, { status: 500 });
  }
}
