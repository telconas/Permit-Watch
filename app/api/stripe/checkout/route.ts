import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { siteUrl, stripe } from '@/lib/stripe';
import { isDemo, writeDemo } from '@/lib/demo';

// POST from the "Subscribe" buttons → Stripe Checkout (subscription mode).
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(`${siteUrl()}/login?next=/dashboard`, { status: 303 });
  if (isDemo()) {
    // Pretend checkout: mark the demo account as subscribed.
    await writeDemo({ subscribed: true });
    return NextResponse.redirect(new URL('/dashboard?checkout=success', request.url), { status: 303 });
  }
  const { user, profile } = session;

  let customerId = profile.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe().customers.create({ email: user.email ?? undefined, metadata: { user_id: user.id } });
    customerId = customer.id;
    await supabaseAdmin().from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
  }

  const checkout = await stripe().checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    allow_promotion_codes: true,
    subscription_data: { metadata: { user_id: user.id } },
    success_url: `${siteUrl()}/dashboard?checkout=success`,
    cancel_url: `${siteUrl()}/dashboard`,
  });

  return NextResponse.redirect(checkout.url!, { status: 303 });
}
