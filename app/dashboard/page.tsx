import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PermitCard } from '@/components/PermitCard';
import { SubscribeBox } from '@/components/SubscribeBox';
import { isSubscribed, requireSession } from '@/lib/session';
import { latestRun, listPermits } from '@/lib/permits';
import { TRADE_INFO } from '@/lib/trades';
import { timeAgo } from '@/lib/format';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 24;
const DAY_OPTIONS = [
  { value: '1', label: 'Today' },
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];

type SP = { view?: string; q?: string; days?: string; min?: string; page?: string; welcome?: string; checkout?: string };

export default async function Dashboard({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { profile } = await requireSession('/dashboard');
  if (!profile.trade || !profile.zips?.length) redirect('/onboarding');

  const subscribed = isSubscribed(profile);
  const view = sp.view === 'all' ? 'all' : 'matches';
  const days = Number(sp.days ?? 30) || 30;
  const minValue = Number(sp.min ?? 0) || 0;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const q = (sp.q ?? '').slice(0, 80);
  const trade = profile.trade;
  const tradeLabel = TRADE_INFO[trade].label;

  const base = view === 'matches' ? { trade, zips: profile.zips } : {};
  const [{ permits, count }, run, today] = await Promise.all([
    listPermits({
      ...base,
      q: subscribed ? q : undefined,
      days,
      minValue: subscribed ? minValue : undefined,
      limit: subscribed ? PAGE_SIZE : 3,
      offset: subscribed ? (page - 1) * PAGE_SIZE : 0,
    }),
    latestRun(),
    listPermits({ trade, zips: profile.zips, days: 1, limit: 1 }),
  ]);

  const newCutoff = run?.finished_at ? new Date(run.finished_at).getTime() - 26 * 3_600_000 : 0;
  const pages = Math.ceil(count / PAGE_SIZE);
  const qs = (over: Partial<SP>) => {
    const params = new URLSearchParams();
    const merged = { view, q, days: String(days), min: minValue ? String(minValue) : '', page: '', ...over };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, String(v));
    return `/dashboard?${params}`;
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {sp.checkout === 'success' && (
        <div className="mb-6 rounded-lg bg-brand-soft p-4 text-brand-dark" role="status">
          <p className="font-semibold">Thanks for subscribing.</p>
          <p className="text-sm">
            {subscribed ? 'Your full list is unlocked.' : 'Your subscription is activating. Refresh in a few seconds if the list is still locked.'}
          </p>
        </div>
      )}
      {sp.welcome && !subscribed && (
        <div className="mb-6 rounded-lg bg-brand-soft p-4 text-brand-dark" role="status">
          <p className="font-semibold">You&apos;re set up for {tradeLabel.toLowerCase()} in {profile.zips.length} ZIP codes.</p>
          <p className="text-sm">Here&apos;s a preview of your matches. Subscribe to unlock the full list and the morning email.</p>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{tradeLabel} · {profile.zips.join(', ')}</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            {view === 'matches' ? 'Your matches' : 'All Sarasota applications'}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-ink-2">
            <span className={`h-2 w-2 rounded-full ${run && !run.error ? 'bg-[#1e8a5a]' : 'bg-line-2'}`} />
            {run ? `Imported ${timeAgo(run.finished_at)}` : 'Waiting for the first import'} · {today.count} {today.count === 1 ? 'match' : 'matches'} applied since yesterday
          </p>
        </div>
        <div role="group" aria-label="Which permits" className="flex overflow-hidden rounded-lg border border-line-2 bg-card text-sm">
          <Link href={qs({ view: 'matches' })} className={`px-4 py-3 font-medium ${view === 'matches' ? 'bg-ink text-white' : 'hover:bg-ground'}`} aria-current={view === 'matches' ? 'page' : undefined}>
            My matches
          </Link>
          <Link href={qs({ view: 'all' })} className={`border-l border-line-2 px-4 py-3 font-medium ${view === 'all' ? 'bg-ink text-white' : 'hover:bg-ground'}`} aria-current={view === 'all' ? 'page' : undefined}>
            All permits
          </Link>
        </div>
      </div>

      <form method="get" className="mt-6 card grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto_auto]">
        <input type="hidden" name="view" value={view} />
        <label className="text-sm font-medium">
          <span className="sr-only">Search</span>
          <input name="q" defaultValue={q} className="field" placeholder="Search address, description, contractor or ID" disabled={!subscribed} />
        </label>
        <label className="text-sm font-medium">
          <span className="sr-only">Applied within</span>
          <select name="days" defaultValue={String(days)} className="field">
            {DAY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          <span className="sr-only">Minimum value</span>
          <select name="min" defaultValue={String(minValue)} className="field" disabled={!subscribed}>
            <option value="0">Any value</option>
            <option value="10000">$10k+</option>
            <option value="50000">$50k+</option>
            <option value="250000">$250k+</option>
          </select>
        </label>
        <button type="submit" className="btn-primary">
          Filter
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        {count.toLocaleString()} {view === 'matches' ? (count === 1 ? 'match' : 'matches') : count === 1 ? 'application' : 'applications'} in the last {days === 1 ? 'day' : `${days} days`}
      </p>

      {permits.length ? (
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {permits.map((p) => (
            <PermitCard
              key={p.app_id}
              permit={p}
              highlight={trade}
              href={subscribed ? `/permits/${encodeURIComponent(p.app_id)}` : undefined}
              isNew={new Date(p.first_seen_at).getTime() > newCutoff}
            />
          ))}
        </div>
      ) : (
        <div className="mt-3 card p-6 text-ink-2">
          <p className="font-semibold text-ink">No permits match yet.</p>
          <p className="mt-1 text-sm">
            Try a longer date range, switch to All permits, or <Link className="font-semibold text-brand underline" href="/settings">add ZIP codes</Link>.
          </p>
        </div>
      )}

      {!subscribed && (
        <div className="mt-8">
          <SubscribeBox matches={count} tradeLabel={tradeLabel} />
        </div>
      )}

      {subscribed && pages > 1 && (
        <nav className="mt-8 flex items-center justify-between" aria-label="Pages">
          {page > 1 ? (
            <Link className="btn-ghost" href={qs({ page: String(page - 1) })}>
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link className="btn-ghost" href={qs({ page: String(page + 1) })}>
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  );
}
