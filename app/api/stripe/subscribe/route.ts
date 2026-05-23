import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const PLANS = [
  { id: 'monthly', price: 2900, label: 'Monthly — $29 NZD/month', days: 30 },
  { id: 'yearly', price: 24900, label: 'Yearly — $249 NZD/year (save 28%)', days: 365 }
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
    const planIndex = Number(body.plan);

    if (!Number.isFinite(planIndex) || planIndex < 0 || planIndex >= PLANS.length) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const plan = PLANS[planIndex];
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
              name: `RentFinder Premium — ${plan.id === 'monthly' ? 'Monthly' : 'Yearly'}`,
              description: 'Unlimited listings, analytics dashboard, verified badge, priority support'
            },
            unit_amount: plan.price
          },
          quantity: 1
        }
      ],
      metadata: {
        type: 'premium',
        plan: plan.id,
        days: String(plan.days),
        email: session.user.email
      },
      success_url: `${origin}/premium?subscribed=1`,
      cancel_url: `${origin}/premium?subscribed=0`
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
