// The search engine: one compact record per permit, a MiniSearch index over it, and the filters.
// Pure code with no server imports, so the browser (instant search) and the server (CSV export)
// run exactly the same search.
import MiniSearch, { type SearchResult } from 'minisearch';
import { categorize, isCategory, isStage, stageOf, type CategoryId, type StageId } from './classify';
import { isTrade, type Trade } from './trades';

/** Compact permit record shipped to the browser. Short keys keep the index file small. */
export type Rec = {
  id: string; // application ID
  ap: string | null; // applied date YYYY-MM-DD
  is: string | null; // issued date
  co: string | null; // completed date (passed final)
  st: string; // city status
  sg: StageId;
  ca: CategoryId[];
  ty: string; // subtype or application type
  ad: string; // address
  zp: string | null;
  de: string; // work description
  cn: string; // contractor company
  ow: string; // owner
  va: number | null; // declared value
  tg: Trade[]; // follow-on lead tags
  fs: string; // first seen by the scraper (ISO)
};

type Source = Record<string, unknown> & { app_id: string };

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const usDate = (v: unknown) => {
  const m = str(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : null;
};

export function toRec(p: Source): Rec {
  const fields = (p.fields ?? {}) as Record<string, Record<string, string>>;
  const completed = str(p.completed_date) || usDate(fields['Inquiry Results']?.['Date Completed']);
  const permit = { app_type: str(p.app_type), subtype: str(p.subtype), work_type: str(p.work_type), description: str(p.description) };
  return {
    id: p.app_id,
    ap: str(p.applied_date) || null,
    is: str(p.issued_date) || null,
    co: completed || null,
    st: str(p.status),
    sg: stageOf(str(p.status)),
    ca: categorize(permit),
    ty: permit.subtype || permit.app_type,
    ad: str(p.address),
    zp: str(p.zip) || null,
    de: permit.description,
    cn: str(p.contractor_company),
    ow: str(p.owner_name).replace(/,\s*$/, ''),
    va: typeof p.valuation === 'number' ? p.valuation : null,
    tg: (Array.isArray(p.tags) ? p.tags : []).filter(isTrade),
    fs: str(p.first_seen_at),
  };
}

/** Splits text into search words. Hyphenated IDs like 2027-000874 stay searchable whole and in parts. */
export function tokenize(text: string): string[] {
  const words = text.toLowerCase().split(/[^a-z0-9#&'-]+/).filter(Boolean);
  const out: string[] = [];
  for (const w of words) {
    const clean = w.replace(/^['&-]+|['&-]+$/g, '');
    if (!clean) continue;
    out.push(clean);
    if (/[-']/.test(clean)) out.push(...clean.split(/[-']/).filter(Boolean));
  }
  return out;
}

/** One typo in words of 5+ letters; never in numbers (permit IDs, street numbers, ZIPs). */
const STRICT_FUZZY = (term: string) => (/\d/.test(term) || term.length < 5 ? false : 1);

/** "remodle" → ["remodle", "ermodle", "rmeodle", …, "remodel"]: catches swapped letters. */
function withSwaps(term: string): string[] {
  if (/\d/.test(term) || term.length < 4) return [term];
  const out = new Set([term]);
  for (let i = 0; i < term.length - 1; i++) out.add(term.slice(0, i) + term[i + 1] + term[i] + term.slice(i + 2));
  return [...out];
}

/**
 * Searches strictly first. Only if that finds nothing does it loosen up (swapped letters, and one
 * typo in 4-letter words too), so everyday searches stay precise and "remodle" still finds remodels.
 */
export function searchIndex(index: MiniSearch<Rec>, q: string): { results: SearchResult[]; loosened: boolean } {
  const strict = index.search(q);
  if (strict.length) return { results: strict, loosened: false };
  const terms = [...new Set(tokenize(q))];
  if (!terms.length) return { results: [], loosened: false };
  const results = index.search(
    { combineWith: 'AND', queries: terms.map((t) => ({ combineWith: 'OR', queries: withSwaps(t) })) },
    { fuzzy: (t: string) => (/\d/.test(t) || t.length < 4 ? false : 1) },
  );
  return { results, loosened: results.length > 0 };
}

export function buildIndex(recs: Rec[]) {
  const index = new MiniSearch<Rec>({
    idField: 'id',
    fields: ['id', 'ad', 'zp', 'de', 'cn', 'ow', 'ty'],
    storeFields: [],
    tokenize,
    searchOptions: {
      boost: { id: 4, ad: 3, cn: 3, ow: 2, ty: 2, zp: 2, de: 1 },
      prefix: true,
      fuzzy: STRICT_FUZZY,
      combineWith: 'AND',
    },
  });
  index.addAll(recs);
  return index;
}

// ------------------------------------------------------------------ filters

export type SortId = 'best' | 'newest' | 'finished' | 'value';

export type Params = {
  q: string;
  cat: CategoryId | null;
  stage: StageId | 'active' | 'all';
  zip: string | null;
  days: number; // 0 = any time
  min: number;
  lead: Trade | null;
  sort: SortId;
  fresh: boolean; // only "new since your last visit"
};

export const DEFAULT_PARAMS: Params = { q: '', cat: null, stage: 'active', zip: null, days: 0, min: 0, lead: null, sort: 'best', fresh: false };

/** URL query string ⇄ Params. Shared links and bookmarks depend on these names staying stable. */
export function readParams(get: (k: string) => string | null): Params {
  const stage = get('stage');
  const sort = get('sort');
  return {
    q: (get('q') ?? '').slice(0, 100),
    cat: isCategory(get('cat')) ? (get('cat') as CategoryId) : null,
    stage: stage === 'all' ? 'all' : isStage(stage) ? stage : 'active',
    zip: /^\d{5}$/.test(get('zip') ?? '') ? get('zip') : null,
    days: Math.max(0, Math.min(3650, Number(get('days')) || 0)),
    min: Math.max(0, Number(get('min')) || 0),
    lead: isTrade(get('lead')) ? (get('lead') as Trade) : null,
    sort: sort === 'newest' || sort === 'finished' || sort === 'value' ? sort : 'best',
    fresh: get('new') === '1',
  };
}

export function writeParams(p: Params): string {
  const u = new URLSearchParams();
  if (p.q.trim()) u.set('q', p.q.trim());
  if (p.cat) u.set('cat', p.cat);
  if (p.stage !== 'active') u.set('stage', p.stage);
  if (p.zip) u.set('zip', p.zip);
  if (p.days) u.set('days', String(p.days));
  if (p.min) u.set('min', String(p.min));
  if (p.lead) u.set('lead', p.lead);
  if (p.sort !== 'best') u.set('sort', p.sort);
  if (p.fresh) u.set('new', '1');
  return u.toString();
}

export type Hit = { rec: Rec; terms: string[]; score: number };

type Skip = 'cat' | 'stage' | null;

function passes(r: Rec, p: Params, ctx: { since: string; lastVisit: string | null }, skip: Skip) {
  if (skip !== 'cat' && p.cat && !r.ca.includes(p.cat)) return false;
  if (skip !== 'stage') {
    if (p.stage === 'active' && r.sg === 'inactive') return false;
    if (p.stage !== 'active' && p.stage !== 'all' && r.sg !== p.stage) return false;
  }
  if (p.zip && r.zp !== p.zip) return false;
  if (p.days) {
    // "Finished" counts from the completion date; everything else from the application date.
    const date = p.stage === 'finished' ? r.co : r.ap;
    if (!date || date < ctx.since) return false;
  }
  if (p.min && (r.va ?? 0) < p.min) return false;
  if (p.lead && !r.tg.includes(p.lead)) return false;
  if (p.fresh && !(ctx.lastVisit && r.fs > ctx.lastVisit)) return false;
  return true;
}

const byNewest = (a: Rec, b: Rec) => (b.ap ?? '').localeCompare(a.ap ?? '') || b.fs.localeCompare(a.fs) || b.id.localeCompare(a.id);

export type Outcome = {
  hits: Hit[];
  categoryCounts: Partial<Record<CategoryId, number>>;
  stageCounts: Partial<Record<StageId | 'active' | 'all', number>>;
  freshCount: number;
  /** True when nothing matched exactly and these are close spellings instead. */
  loosened: boolean;
};

/**
 * Runs a search. `now` and `lastVisit` are passed in (not read here) so server and browser agree
 * and results don't depend on when the code happens to run.
 */
export function runSearch(
  index: MiniSearch<Rec> | null,
  recs: Rec[],
  byId: Map<string, Rec>,
  p: Params,
  opts: { now: Date; lastVisit: string | null },
): Outcome {
  const since = new Date(opts.now.getTime() - p.days * 86_400_000).toISOString().slice(0, 10);
  const ctx = { since, lastVisit: opts.lastVisit };

  let pool: Hit[];
  let loosened = false;
  const q = p.q.trim();
  if (q && index) {
    const found = searchIndex(index, q);
    loosened = found.loosened;
    pool = found.results.flatMap((r) => {
      const rec = byId.get(String(r.id));
      return rec ? [{ rec, terms: r.terms, score: r.score }] : [];
    });
  } else {
    pool = recs.map((rec) => ({ rec, terms: [], score: 0 }));
  }

  // Facet counts: how many results each chip would give, with the other filters applied.
  const categoryCounts: Outcome['categoryCounts'] = {};
  const stageCounts: Outcome['stageCounts'] = {};
  let freshCount = 0;
  const hits: Hit[] = [];
  for (const h of pool) {
    const r = h.rec;
    if (passes(r, p, ctx, 'cat')) for (const c of r.ca) categoryCounts[c] = (categoryCounts[c] ?? 0) + 1;
    if (passes(r, p, ctx, 'stage')) {
      stageCounts[r.sg] = (stageCounts[r.sg] ?? 0) + 1;
      stageCounts.all = (stageCounts.all ?? 0) + 1;
      if (r.sg !== 'inactive') stageCounts.active = (stageCounts.active ?? 0) + 1;
    }
    if (passes(r, { ...p, fresh: false }, ctx, null) && opts.lastVisit && r.fs > opts.lastVisit) freshCount++;
    if (passes(r, p, ctx, null)) hits.push(h);
  }

  const sort = p.sort === 'best' && !q ? 'newest' : p.sort;
  if (sort === 'newest') hits.sort((a, b) => byNewest(a.rec, b.rec));
  else if (sort === 'finished') hits.sort((a, b) => (b.rec.co ?? '').localeCompare(a.rec.co ?? '') || byNewest(a.rec, b.rec));
  else if (sort === 'value') hits.sort((a, b) => (b.rec.va ?? -1) - (a.rec.va ?? -1) || byNewest(a.rec, b.rec));
  // 'best' with a query keeps MiniSearch's relevance order.

  return { hits, categoryCounts, stageCounts, freshCount, loosened };
}
