import Link from 'next/link';
import { PermitCard } from './PermitCard';
import { PermitTable } from './PermitTable';
import { distinctZips, latestRun, listPermits } from '@/lib/permits';
import { DAY_OPTIONS, VALUE_OPTIONS, browseHref, parseBrowse, type BrowseParams } from '@/lib/browse';
import { TRADES, TRADE_INFO } from '@/lib/trades';
import { timeAgo } from '@/lib/format';

/** Open access: every permit, every field, with free filters. No sign-in, no paywall. */
export async function OpenBrowser({ sp }: { sp: BrowseParams }) {
  const f = parseBrowse(sp);
  const pageSize = f.layout === 'table' ? 100 : 30;
  const [{ permits, count }, run, zips, all] = await Promise.all([
    listPermits({ ...f.query, limit: pageSize, offset: (f.page - 1) * pageSize }),
    latestRun(),
    distinctZips(),
    listPermits({ limit: 1 }),
  ]);
  const pages = Math.max(1, Math.ceil(count / pageSize));
  const newCutoff = run?.finished_at ? new Date(run.finished_at).getTime() - 26 * 3_600_000 : 0;
  const href = (over: Partial<Record<keyof BrowseParams, string>>) => browseHref('/dashboard', f, over);
  const exportHref = browseHref('/api/export', f).replace(/[?&]layout=[^&]*/, '');
  const filtered = !!(f.q || f.days || f.minValue || f.trade || f.zip || f.taggedOnly);

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">City of Sarasota · all applications</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Permit applications</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-ink-2">
            <span className={`h-2 w-2 rounded-full ${run && !run.error ? 'bg-[#1e8a5a]' : 'bg-line-2'}`} />
            {run ? `Imported ${timeAgo(run.finished_at)}` : 'Waiting for the first import'} · {all.count.toLocaleString()} permits stored
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div role="group" aria-label="Layout" className="flex overflow-hidden rounded-lg border border-line-2 bg-card text-sm">
            <Link href={href({ layout: 'table' })} aria-current={f.layout === 'table' ? 'page' : undefined} className={`px-4 py-3 font-medium ${f.layout === 'table' ? 'bg-ink text-white' : 'hover:bg-ground'}`}>
              Table
            </Link>
            <Link href={href({ layout: 'cards' })} aria-current={f.layout === 'cards' ? 'page' : undefined} className={`border-l border-line-2 px-4 py-3 font-medium ${f.layout === 'cards' ? 'bg-ink text-white' : 'hover:bg-ground'}`}>
              Cards
            </Link>
          </div>
          <a href={exportHref} className="btn-ghost">
            Download CSV
          </a>
        </div>
      </div>

      <form method="get" className="mt-6 card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
        {f.layout === 'cards' && <input type="hidden" name="layout" value="cards" />}
        <label className="text-sm font-medium">
          <span className="sr-only">Search</span>
          <input name="q" defaultValue={f.q} className="field" placeholder="Search address, description, contractor, owner or ID" />
        </label>
        <label className="text-sm font-medium">
          <span className="sr-only">Trade</span>
          <select name="trade" defaultValue={f.trade ?? ''} className="field">
            <option value="">All trades</option>
            {TRADES.map((t) => (
              <option key={t} value={t}>
                {TRADE_INFO[t].label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          <span className="sr-only">ZIP code</span>
          <select name="zip" defaultValue={f.zip} className="field">
            <option value="">All ZIP codes</option>
            {zips.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          <span className="sr-only">Applied</span>
          <select name="days" defaultValue={String(f.days)} className="field">
            {DAY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          <span className="sr-only">Minimum value</span>
          <select name="min" defaultValue={String(f.minValue)} className="field">
            {VALUE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn-primary">
          Filter
        </button>
        <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2 lg:col-span-6">
          <input type="checkbox" name="tagged" value="1" defaultChecked={f.taggedOnly} className="h-4 w-4 accent-[#0f5c55]" />
          Only permits tagged for a trade
          {filtered && (
            <Link href={browseHref('/dashboard', { ...f, q: '', days: 0, minValue: 0, trade: null, zip: '', taggedOnly: false })} className="ml-auto font-semibold text-brand hover:underline">
              Clear filters
            </Link>
          )}
        </label>
      </form>

      <p className="mt-6 text-sm text-muted">
        {count.toLocaleString()} {count === 1 ? 'permit' : 'permits'}
        {pages > 1 ? ` · showing ${((f.page - 1) * pageSize + 1).toLocaleString()}–${Math.min(f.page * pageSize, count).toLocaleString()}` : ''}
      </p>

      <div className="mt-3">
        {permits.length === 0 ? (
          <div className="card p-6 text-ink-2">
            {all.count === 0 ? 'No permits yet. Run the import (npm run scrape:json, or the GitHub action) to load them.' : 'No permits match these filters.'}
          </div>
        ) : f.layout === 'table' ? (
          <PermitTable permits={permits} newCutoff={newCutoff} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {permits.map((p) => (
              <PermitCard key={p.app_id} permit={p} highlight={f.trade} href={`/permits/${encodeURIComponent(p.app_id)}`} isNew={new Date(p.first_seen_at).getTime() > newCutoff} />
            ))}
          </div>
        )}
      </div>

      {pages > 1 && (
        <nav className="mt-8 flex items-center justify-between" aria-label="Pages">
          {f.page > 1 ? (
            <Link className="btn-ghost" href={href({ page: String(f.page - 1) })}>
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted">
            Page {f.page} of {pages}
          </span>
          {f.page < pages ? (
            <Link className="btn-ghost" href={href({ page: String(f.page + 1) })}>
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
