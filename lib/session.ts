import 'server-only';
import { redirect } from 'next/navigation';
import { supabaseAdmin, supabaseServer } from './supabase/server';
import { demoSession, isDemo } from './demo';
import type { Trade } from './trades';

export type Profile = {
  id: string;
  email: string | null;
  trade: Trade | null;
  zips: string[];
  digest_enabled: boolean;
  stripe_customer_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
};

export const ACTIVE_STATUSES = ['active', 'trialing', 'past_due'];

export function isSubscribed(p: Pick<Profile, 'subscription_status'> | null) {
  return !!p?.subscription_status && ACTIVE_STATUSES.includes(p.subscription_status);
}

/** The signed-in user and their profile, or null. */
export async function getSession() {
  if (isDemo()) return demoSession();
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await supabaseAdmin().from('profiles').select('*').eq('id', user.id).maybeSingle();
  let profile = data as Profile | null;
  if (!profile) {
    // Trigger missed (e.g. table created after signup): create it now.
    const { data: created } = await supabaseAdmin()
      .from('profiles')
      .upsert({ id: user.id, email: user.email })
      .select('*')
      .single();
    profile = created as Profile;
  }
  return { user, profile };
}

export async function requireSession(next = '/dashboard') {
  const s = await getSession();
  if (!s) redirect(`/login?next=${encodeURIComponent(next)}`);
  return s;
}
