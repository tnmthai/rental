import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const FEATURED_PLANS = [
  { days: 7, price: 500, label: '7 days — $5 NZD' },
  { days: 14, price: 900, label: '14 days — $9 NZD' },
  { days: 30, price: 1500, label: '30 days — $15 NZD' }
];

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' });

    const body = await req.json();
    const listingId = Number(body.listing_id);
    const planIndex = Number(body.plan);

    if (!listingId || !Number.isFinite(planIndex) || planIndex < 0 || planIndex >= FEATURED_PLANS.length) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const plan = FEATURED_PLANS[planIndex];
    const origin = req.headers.get('origin') || 'https://www.rentfinder.nz';

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: session.user.email,
      line_items: [
        {
          price_data: {
            currency: 'nzd',
            product_data: {
              name: `Feature Listing #${listingId}`,
              description: `Boost your listing for ${plan.days} days — appears at the top of search results.`
            },
            unit_amount: plan.price
          },
          quantity: 1
        }
      ],
      metadata: {
        listing_id: String(listingId),
        days: String(plan.days),
        email: session.user.email
      },
      success_url: `${origin}/dashboard?boosted=1`,
      cancel_url: `${origin}/dashboard?boosted=0`
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
