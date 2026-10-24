import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/session';
import { siteUrl, stripe } from '@/lib/stripe';
import { isDemo, writeDemo } from '@/lib/demo';

// POST from Settings → Stripe customer portal (update card, see invoices, cancel).
export async function POST(request: NextRequest) {
  if (isDemo()) {
    // Pretend cancellation so the locked preview can be seen again.
    await writeDemo({ subscribed: false });
    return NextResponse.redirect(new URL('/settings', request.url), { status: 303 });
  }
  const session = await getSession();
  if (!session?.profile.stripe_customer_id) return NextResponse.redirect(`${siteUrl()}/settings`, { status: 303 });
  const portal = await stripe().billingPortal.sessions.create({
    customer: session.profile.stripe_customer_id,
    return_url: `${siteUrl()}/settings`,
  });
  return NextResponse.redirect(portal.url, { status: 303 });
}
