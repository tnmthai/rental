import { NextRequest, NextResponse } from 'next/server';
import { setListingFeatured } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' });

    const body = await req.text();
    const sig = req.headers.get('stripe-signature') || '';

    let event: any;
    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const listingId = Number(session.metadata?.listing_id);
      const days = Number(session.metadata?.days);

      if (listingId && days && Number.isFinite(listingId) && Number.isFinite(days)) {
        const featuredUntil = new Date(Date.now() + days * 86_400_000).toISOString();
        await setListingFeatured(listingId, true, featuredUntil);
      }
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
