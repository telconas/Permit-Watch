import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { ACTIVE_STATUSES, type Profile } from '@/lib/session';
import { digestEmail, sendEmail } from '@/lib/digest';
import type { Permit } from '@/lib/permits';
import { siteUrl } from '@/lib/stripe';

export const runtime = 'nodejs';
export const maxDuration = 300;

// .github/workflows/digest.yml calls this every morning with "Authorization: Bearer $CRON_SECRET".
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const db = supabaseAdmin();
  const { data: profiles, error } = await db
    .from('profiles')
    .select('*')
    .eq('digest_enabled', true)
    .in('subscription_status', ACTIVE_STATUSES)
    .not('trade', 'is', null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const dateLabel = new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' });
  const results: { email: string | null; sent: number; error?: string }[] = [];

  for (const p of (profiles ?? []) as (Profile & { last_digest_at: string | null })[]) {
    if (!p.email || !p.trade || !p.zips?.length) continue;
    const since = p.last_digest_at ?? new Date(Date.now() - 24 * 3_600_000).toISOString();
    try {
      const { data: permits, error: e } = await db
        .from('permits')
        .select('*')
        .contains('tags', [p.trade])
        .in('zip', p.zips)
        .gt('first_seen_at', since)
        .order('valuation', { ascending: false, nullsFirst: false })
        .limit(50);
      if (e) throw e;
      const msg = digestEmail({ trade: p.trade, zips: p.zips, permits: (permits ?? []) as Permit[], siteUrl: siteUrl(), dateLabel });
      await sendEmail(p.email, msg);
      await db.from('profiles').update({ last_digest_at: new Date().toISOString() }).eq('id', p.id);
      results.push({ email: p.email, sent: permits?.length ?? 0 });
    } catch (err) {
      results.push({ email: p.email, sent: 0, error: (err as Error).message });
    }
  }
  return NextResponse.json({ subscribers: results.length, results });
}
