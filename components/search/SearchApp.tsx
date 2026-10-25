'use client';

import Link from 'next/link';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORIES, CATEGORY_LABEL, STAGES, STAGE_LABEL, type CategoryId, type StageId } from '@/lib/classify';
import { DEFAULT_PARAMS, buildIndex, readParams, runSearch, writeParams, type Hit, type Params, type Rec } from '@/lib/search-core';
import { TRADES, TRADE_INFO, type Trade } from '@/lib/trades';
import { money, readable, shortDate } from '@/lib/format';
import { highlight } from './highlight';
import { registerVisit } from './visits';
import { rememberSearch } from './nav';

const PAGE = 40;

const DAY_OPTIONS = [
  { value: 0, label: 'Any time' },
  { value: 2, label: 'Last 2 days' },
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
];

const VALUE_OPTIONS = [
  { value: 0, label: 'Any value' },
  { value: 5000, label: '$5k+' },
  { value: 20000, label: '$20k+' },
  { value: 50000, label: '$50k+' },
  { value: 250000, label: '$250k+' },
];

const STAGE_STYLE: Record<StageId, string> = {
  filed: 'bg-[#e8eef8] text-[#1f4e8c]',
  approved: 'bg-[#f0e9f7] text-[#5e2f80]',
  underway: 'bg-[#fff1df] text-[#8a4300]',
  finished: 'bg-[#e2f2ea] text-[#0e5a3e]',
  inactive: 'bg-ground text-muted',
};

type Props = {
  initial: Rec[];
  total: number;
  /** Start of the latest import: what first-time visitors see as "New today". */
  newSince: string | null;
  updatedLabel: string;
};

export function SearchApp({ initial, total, newSince, updatedLabel }: Props) {
  // The page is pre-built without any search, so the first render must be the plain page; the
  // search in the address bar is applied right after (otherwise React reports a mismatch).
  const [params, setParams] = useState<Params>(DEFAULT_PARAMS);
  const [view, setView] = useState<'list' | 'table'>('list');
  const [fromUrl, setFromUrl] = useState(false);
  const [recs, setRecs] = useState<Rec[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [lastVisit, setLastVisit] = useState<string | null>(null);
  const [isReturning, setIsReturning] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setParams(readParams((k) => sp.get(k)));
    setView(sp.get('view') === 'table' ? 'table' : 'list');
    setFromUrl(true);
  }, []);

  // Load the search index once.
  useEffect(() => {
    let alive = true;
    fetch('/api/search-index')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { recs: Rec[] }) => alive && setRecs(d.recs))
      .catch(() => alive && setLoadError(true));
    return () => {
      alive = false;
    };
  }, []);

  // "New since your last visit". On a first visit, fall back to "added by the latest import".
  useEffect(() => {
    const prev = registerVisit();
    if (prev) {
      setLastVisit(prev);
      setIsReturning(true);
    } else if (newSince) {
      setLastVisit(newSince);
    }
  }, [newSince]);

  // "/" jumps to the search box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(el.tagName) && !el.isContentEditable) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Keep the address bar in step, so every search can be bookmarked or shared.
  useEffect(() => {
    if (!fromUrl) return;
    const t = setTimeout(() => {
      const qs = writeParams(params);
      const full = view === 'table' ? (qs ? `${qs}&view=table` : 'view=table') : qs;
      const url = full ? `/?${full}` : '/';
      if (url !== window.location.pathname + window.location.search) window.history.replaceState(null, '', url);
    }, 300);
    return () => clearTimeout(t);
  }, [params, view, fromUrl]);

  const update = useCallback((patch: Partial<Params>) => {
    setParams((p) => ({ ...p, ...patch }));
    setLimit(PAGE);
  }, []);

  const index = useMemo(() => (recs ? buildIndex(recs) : null), [recs]);
  const byId = useMemo(() => new Map((recs ?? []).map((r) => [r.id, r])), [recs]);
  const zips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of recs ?? []) if (r.zp) counts.set(r.zp, (counts.get(r.zp) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [recs]);

  // Typing stays smooth: the results catch up a moment behind the keystrokes.
  const deferred = useDeferredValue(params);
  const outcome = useMemo(
    () => (recs ? runSearch(index, recs, byId, deferred, { now: new Date(), lastVisit }) : null),
    [recs, index, byId, deferred, lastVisit],
  );

  const filtered =
    params.q.trim() !== '' || params.cat || params.stage !== 'active' || params.zip || params.days || params.min || params.lead || params.fresh;
  const exportHref = `/api/export?${writeParams(params)}${params.fresh && lastVisit ? `&since=${encodeURIComponent(lastVisit)}` : ''}`;

  return (
    <main className="mx-auto max-w-6xl px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Search Sarasota permits</h1>
        <p className="text-sm text-muted">
          {total.toLocaleString()} permits · updated {updatedLabel}
        </p>
      </div>

      <form role="search" onSubmit={(e) => e.preventDefault()} className="relative mt-4">
        <label htmlFor="q" className="sr-only">
          Search permits
        </label>
        <svg className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          id="q"
          ref={inputRef}
          type="search"
          value={params.q}
          onChange={(e) => update({ q: e.target.value })}
          placeholder="Pool, kitchen, a company, an address, a permit number…"
          autoComplete="off"
          enterKeyHint="search"
          className="h-14 w-full rounded-xl border border-line-2 bg-card pr-12 pl-12 text-lg text-ink shadow-sm placeholder:text-muted focus:border-brand focus:outline-none"
        />
        {params.q && (
          <button
            type="button"
            onClick={() => {
              update({ q: '' });
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="absolute top-1/2 right-2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-ground"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </form>

      {/* Stage */}
      <div className="mt-4 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Stage">
        <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          <Chip active={params.stage === 'active'} onClick={() => update({ stage: 'active' })} count={outcome?.stageCounts.active}>
            All active
          </Chip>
          {STAGES.map((s) => (
            <Chip key={s.id} active={params.stage === s.id} onClick={() => update({ stage: params.stage === s.id ? 'active' : s.id })} count={outcome?.stageCounts[s.id]} title={s.hint}>
              {s.label}
            </Chip>
          ))}
          {lastVisit && (
            <Chip active={params.fresh} onClick={() => update({ fresh: !params.fresh })} count={outcome?.freshCount} accent>
              {isReturning ? 'New since your last visit' : 'New today'}
            </Chip>
          )}
        </div>
      </div>

      {/* Category */}
      <div className="mt-2 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Category">
        <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          {CATEGORIES.filter((c) => params.cat === c.id || (outcome?.categoryCounts[c.id] ?? (recs ? 0 : 1)) > 0).map((c) => (
            <Chip key={c.id} subtle active={params.cat === c.id} onClick={() => update({ cat: params.cat === c.id ? null : c.id })} count={outcome?.categoryCounts[c.id]}>
              {c.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* More filters */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Select label="ZIP code" value={params.zip ?? ''} onChange={(v) => update({ zip: v || null })}>
          <option value="">All ZIP codes</option>
          {zips.map(([z, n]) => (
            <option key={z} value={z}>
              {z} ({n})
            </option>
          ))}
        </Select>
        <Select label={params.stage === 'finished' ? 'Finished' : 'Applied'} value={String(params.days)} onChange={(v) => update({ days: Number(v) })}>
          {DAY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {params.stage === 'finished' && o.value ? o.label.replace('Last', 'Finished last') : o.label}
            </option>
          ))}
        </Select>
        <Select label="Value" value={String(params.min)} onChange={(v) => update({ min: Number(v) })}>
          {VALUE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select label="Good lead for" value={params.lead ?? ''} onChange={(v) => update({ lead: (v || null) as Trade | null })}>
          <option value="">Any trade</option>
          {TRADES.map((t) => (
            <option key={t} value={t}>
              Lead for {TRADE_INFO[t].label.toLowerCase()}
            </option>
          ))}
        </Select>
        <Select label="Sort" value={params.sort} onChange={(v) => update({ sort: v as Params['sort'] })} className="col-span-2 sm:col-span-1">
          <option value="best">{params.q.trim() ? 'Best match' : 'Newest first'}</option>
          <option value="newest">Newest first</option>
          <option value="finished">Recently finished</option>
          <option value="value">Highest value</option>
        </Select>
      </div>

      {/* Result header */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-2" aria-live="polite">
          {outcome ? (
            <>
              <span className="font-semibold text-ink">{outcome.hits.length.toLocaleString()}</span> {outcome.hits.length === 1 ? 'permit' : 'permits'}
              {outcome.loosened && <> · no exact match, showing close spellings</>}
            </>
          ) : loadError ? (
            'Couldn’t load the search. Refresh the page to try again.'
          ) : (
            'Loading search…'
          )}
          {filtered && (
            <button type="button" onClick={() => update(DEFAULT_PARAMS)} className="ml-3 font-semibold text-brand hover:underline">
              Clear all
            </button>
          )}
        </p>
        <div className="flex items-center gap-2">
          <a href={exportHref} className="btn-ghost min-h-10 px-3">
            Download CSV
          </a>
          <div role="group" aria-label="Layout" className="hidden overflow-hidden rounded-lg border border-line-2 bg-card text-sm sm:flex">
            {(['list', 'table'] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={`min-h-10 px-3 font-medium capitalize ${view === v ? 'bg-ink text-white' : 'hover:bg-ground'} ${v === 'table' ? 'border-l border-line-2' : ''}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mt-3">
        {!outcome ? (
          !filtered && initial.length && (!fromUrl || !window.location.search) ? (
            <ResultList hits={initial.map((rec) => ({ rec, terms: [], score: 0 }))} lastVisit={null} />
          ) : (
            <SkeletonList />
          )
        ) : outcome.hits.length === 0 ? (
          <div className="card p-6 text-ink-2">
            <p className="font-semibold text-ink">No permits match.</p>
            <p className="mt-1 text-sm">Try fewer words, a different spelling, or clear a filter.</p>
          </div>
        ) : view === 'table' ? (
          <ResultTable hits={outcome.hits.slice(0, limit)} lastVisit={lastVisit} />
        ) : (
          <ResultList hits={outcome.hits.slice(0, limit)} lastVisit={lastVisit} />
        )}
        {outcome && outcome.hits.length > limit && (
          <div className="mt-6 flex justify-center">
            <button type="button" onClick={() => setLimit((n) => n + PAGE * 2)} className="btn-ghost w-full max-w-xs">
              Show more ({(outcome.hits.length - limit).toLocaleString()} left)
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

// ------------------------------------------------------------------ pieces

function Chip(props: { active: boolean; onClick: () => void; count?: number; children: React.ReactNode; subtle?: boolean; accent?: boolean; title?: string }) {
  const { active, onClick, count, children, subtle, accent, title } = props;
  const base = 'inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors';
  const tone = active
    ? accent
      ? 'border-hot bg-hot text-white'
      : 'border-ink bg-ink text-white'
    : accent
      ? 'border-hot/40 bg-hot-soft text-[#8a3a05] hover:border-hot'
      : subtle
        ? 'border-line bg-card text-ink-2 hover:border-line-2'
        : 'border-line-2 bg-card text-ink hover:border-ink-2';
  return (
    <button type="button" aria-pressed={active} onClick={onClick} title={title} className={`${base} ${tone}`}>
      {children}
      {count != null && <span className={`tabular-nums ${active ? 'text-white/80' : 'text-muted'}`}>{count.toLocaleString()}</span>}
    </button>
  );
}

function Select(props: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${props.className ?? ''}`}>
      <span className="sr-only">{props.label}</span>
      <select value={props.value} onChange={(e) => props.onChange(e.target.value)} className="field min-h-11 cursor-pointer pr-8 text-sm">
        {props.children}
      </select>
    </label>
  );
}

function dateLine(r: Rec) {
  if (r.sg === 'finished' && r.co) return `Finished ${shortDate(r.co)}`;
  if (r.sg === 'underway' && r.is) return `Issued ${shortDate(r.is)}`;
  return r.ap ? `Applied ${shortDate(r.ap)}` : '';
}

const isNew = (r: Rec, lastVisit: string | null) => !!lastVisit && r.fs > lastVisit;

function ResultList({ hits, lastVisit }: { hits: Hit[]; lastVisit: string | null }) {
  return (
    <ul className="card divide-y divide-line overflow-hidden">
      {hits.map(({ rec: r, terms }) => (
        <li key={r.id}>
          <Link href={`/permits/${encodeURIComponent(r.id)}`} onClick={() => rememberSearch(r.id)} className="block px-4 py-3.5 hover:bg-ground/70 focus-visible:bg-ground/70 sm:px-5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className="rounded-md bg-brand-soft px-2 py-0.5 font-semibold text-brand-dark">{CATEGORY_LABEL[r.ca[0]]}</span>
              <span className={`rounded-md px-2 py-0.5 font-semibold ${STAGE_STYLE[r.sg]}`}>{STAGE_LABEL[r.sg]}</span>
              {isNew(r, lastVisit) && <span className="rounded bg-hot px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white">NEW</span>}
              <span className="ml-auto text-muted">{dateLine(r)}</span>
            </div>
            <p className="mt-1.5 font-semibold">
              {highlight(r.ad || 'No address', terms)}
              {r.zp && <span className="font-normal text-muted"> · {highlight(r.zp, terms)}</span>}
            </p>
            {r.de && <p className="mt-0.5 line-clamp-2 text-sm text-ink-2">{highlight(readable(r.de), terms)}</p>}
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted">
              {r.cn && <span className="text-ink-2">{highlight(r.cn, terms)}</span>}
              {r.ow && <span>Owner: {highlight(r.ow, terms)}</span>}
              {r.va != null && <span className="font-semibold text-ink tabular-nums">{money(r.va)}</span>}
              <span className="font-mono text-xs leading-5">{highlight(r.id, terms)}</span>
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const th = 'px-3 py-2.5 text-left text-xs font-semibold tracking-wide whitespace-nowrap text-muted uppercase';
const td = 'px-3 py-2.5 align-top';

function ResultTable({ hits, lastVisit }: { hits: Hit[]; lastVisit: string | null }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[1200px] border-collapse text-sm">
        <thead className="bg-ground">
          <tr>
            <th scope="col" className={th}>Permit</th>
            <th scope="col" className={th}>Date</th>
            <th scope="col" className={th}>Stage</th>
            <th scope="col" className={th}>Category</th>
            <th scope="col" className={th}>Address</th>
            <th scope="col" className={th}>Work description</th>
            <th scope="col" className={`${th} text-right`}>Value</th>
            <th scope="col" className={th}>Contractor</th>
            <th scope="col" className={th}>Owner</th>
          </tr>
        </thead>
        <tbody>
          {hits.map(({ rec: r, terms }) => (
            <tr key={r.id} className="border-t border-line hover:bg-ground/60">
              <td className={`${td} whitespace-nowrap`}>
                <Link href={`/permits/${encodeURIComponent(r.id)}`} onClick={() => rememberSearch(r.id)} className="font-mono font-medium text-brand hover:underline">
                  {highlight(r.id, terms)}
                </Link>
                {isNew(r, lastVisit) && <span className="ml-2 rounded bg-hot px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white">NEW</span>}
              </td>
              <td className={`${td} whitespace-nowrap text-ink-2`}>{dateLine(r)}</td>
              <td className={td}>
                <span className={`rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${STAGE_STYLE[r.sg]}`}>{STAGE_LABEL[r.sg]}</span>
              </td>
              <td className={`${td} whitespace-nowrap`}>{CATEGORY_LABEL[r.ca[0]]}</td>
              <td className={td}>
                <div className="font-medium whitespace-nowrap">{highlight(r.ad, terms)}</div>
                <div className="text-xs text-muted">{r.zp}</div>
              </td>
              <td className={`${td} max-w-[380px] min-w-[280px] text-ink-2`}>
                <span className="line-clamp-3">{highlight(readable(r.de), terms)}</span>
              </td>
              <td className={`${td} text-right whitespace-nowrap tabular-nums`}>{money(r.va)}</td>
              <td className={`${td} max-w-[220px]`}>{highlight(r.cn, terms)}</td>
              <td className={`${td} max-w-[200px] text-ink-2`}>{highlight(r.ow, terms)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SkeletonList() {
  return (
    <ul className="card divide-y divide-line" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="space-y-2 px-5 py-4">
          <div className="h-3 w-40 animate-pulse rounded bg-ground" />
          <div className="h-4 w-64 animate-pulse rounded bg-ground" />
          <div className="h-3 w-full max-w-lg animate-pulse rounded bg-ground" />
        </li>
      ))}
    </ul>
  );
}
