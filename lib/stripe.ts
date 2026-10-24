import 'server-only';
import Stripe from 'stripe';

let client: Stripe | null = null;

export function stripe() {
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY!);
  return client;
}

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || 'http://localhost:3000').replace(/\/$/, '');
