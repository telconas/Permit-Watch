import Link from 'next/link';
import { PermitCard } from '@/components/PermitCard';
import { feedStats, latestRun, listPermits, type Permit } from '@/lib/permits';
import { TRADES, TRADE_INFO } from '@/lib/trades';
import { longDate, timeAgo } from '@/lib/format';
import { isDemo, usingSamplePermits } from '@/lib/demo';

export const revalidate = 900; // refresh the public preview every 15 minutes

async function loadPreview() {
  try {
    const [{ permits }, stats, run] = await Promise.all([listPermits({ limit: 30, days: 30 }), feedStats(), latestRun()]);
    // Lead with tagged permits so the preview shows what the product does.
    const tagged = permits.filter((p) => p.tags.length);
    const preview = [...tagged, ...permits.filter((p) => !p.tags.length)].slice(0, 6);
    return { preview, stats, run };
  } catch {
    return { preview: [] as Permit[], stats: null, run: null };
  }
}

const STEPS = [
  { title: 'One trade, your ZIPs', body: 'Pick landscaping, fence, pool, gutters or blinds. Add the ZIP codes you actually drive to.' },
  { title: 'Read it in the truck', body: 'Built for a phone: address, permit type, value and why it was tagged, before you pull out.' },
  { title: '7 AM digest', body: "One email every morning with yesterday's new applications. A day with no matches still gets a short note." },
];

export default async function Home() {
  const { preview, stats, run } = await loadPreview();

  return (
    <main>
      <section className="border-b border-line bg-[linear-gradient(var(--color-line)_1px,transparent_1px),linear-gradient(90deg,var(--color-line)_1px,transparent_1px)] bg-[size:32px_32px]">
        <div className="bg-ground/85">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <p className="eyebrow">Sarasota · daily permit applications</p>
            <h1 className="mt-4 max-w-3xl text-5xl leading-[1.02] font-extrabold sm:text-7xl">
              Find the job before the job finds someone else.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-ink-2">
              Permit Watch reads every new City of Sarasota permit application each morning, flags likely landscaping, fence, pool,
              gutter and blinds follow-on work, and filters it to your ZIP codes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login?mode=signup" className="btn-hot text-base">
                Set up your trade <span aria-hidden="true">→</span>
              </Link>
              <a href="#latest" className="btn-ghost text-base">
                See the preview
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="latest" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Latest Sarasota applications</h2>
            <p className="mt-2 max-w-2xl text-ink-2">
              {isDemo() && usingSamplePermits()
                ? 'Sample records for demo mode, shaped like the city’s real ones. Once the daily import runs, this shows real applications.'
                : 'Real records from this morning’s import of the city’s permit portal. The city posts applications as they are filed; dates below are application dates.'}
            </p>
          </div>
          {stats && (
            <p className="text-sm text-muted">
              {stats.last30.toLocaleString()} applications in the past 30 days
              {stats.latestApplied ? ` · latest ${longDate(stats.latestApplied)}` : ''}
            </p>
          )}
        </div>

        <div className="mt-6 card flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-sm">
          <span className="flex items-center gap-2 font-semibold">
            <span className={`h-2 w-2 rounded-full ${run && !run.error ? 'bg-[#1e8a5a]' : 'bg-line-2'}`} />
            {run ? (run.error ? 'Last import had a problem' : 'Feed current') : 'Waiting for first import'}
          </span>
          <span className="text-ink-2">
            {run ? `Imported ${timeAgo(run.finished_at)} from the City of Sarasota Building & Engineering portal.` : 'The first daily import has not run yet.'}
          </span>
          <a
            className="font-semibold text-brand underline-offset-2 hover:underline"
            href="https://ftgportal.sarasotafl.gov/Permits/Search.aspx?microapp=c"
            target="_blank"
            rel="noreferrer"
          >
            View the city&apos;s permit search
          </a>
        </div>

        {preview.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {preview.map((p) => (
              <PermitCard key={p.app_id} permit={p} />
            ))}
          </div>
        ) : (
          <p className="mt-6 card p-6 text-ink-2">Permits will appear here after the first morning import.</p>
        )}
      </section>

      <section className="border-y border-line bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:grid-cols-3 sm:px-6">
          {STEPS.map((s) => (
            <div key={s.title}>
              <h3 className="text-xl font-bold">{s.title}</h3>
              <p className="mt-2 text-ink-2">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-3xl font-bold">How tags work</h2>
        <p className="mt-2 max-w-2xl text-ink-2">
          Each permit gets trade tags from plain rules: a new single-family home usually needs fence, sod, a pool cage and blinds; a
          re-roof often means new gutters. Tags point to likely follow-on work, not confirmed jobs.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {TRADES.map((t) => (
            <div key={t} className="card p-4">
              <h3 className="text-base font-bold">{TRADE_INFO[t].label}</h3>
              <p className="mt-1 text-sm text-ink-2">{TRADE_INFO[t].blurb}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="card mx-auto max-w-xl p-8 text-center">
          <h2 className="text-3xl font-bold">One plan. $99 a month.</h2>
          <ul className="mx-auto mt-6 max-w-sm space-y-2 text-left text-ink-2">
            {[
              'Full permit list with search and filters',
              'Matches for your trade and ZIP codes',
              'Full permit details, owner and contractor, with the city record link',
              '7 AM morning digest by email',
              'Cancel from settings anytime',
            ].map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-brand" aria-hidden="true">
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-6 font-display text-5xl font-extrabold">
            $99<span className="text-lg font-semibold text-muted">/month</span>
          </p>
          <Link href="/login?mode=signup" className="btn-hot mt-6 w-full text-base">
            Create account to subscribe
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl space-y-2 px-4 py-8 text-xs text-muted sm:px-6">
          <p>Permit Watch · Sarasota, FL · Source: City of Sarasota Building &amp; Engineering permit portal · Updated daily</p>
          <p>
            Permit Watch is an independent service and is not affiliated with the City of Sarasota. Records are copied from public permit
            applications and may be incomplete, delayed or changed by the city. Trade tags indicate possible follow-on work, not available
            contracts. Verify details on the city&apos;s portal before acting on them.
          </p>
        </div>
      </footer>
    </main>
  );
}
