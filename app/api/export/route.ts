import { NextResponse, type NextRequest } from 'next/server';
import { getPermit, searchRecords } from '@/lib/permits';
import { buildIndex, readParams, runSearch } from '@/lib/search-core';
import { CATEGORY_LABEL, STAGE_LABEL } from '@/lib/classify';
import { TRADE_INFO } from '@/lib/trades';
import type { Permit } from '@/lib/permits';

export const dynamic = 'force-dynamic';

const COLUMNS: [string, (p: Permit, extra: { category: string; stage: string }) => unknown][] = [
  ['Application ID', (p) => p.app_id],
  ['Permit number', (p) => p.permit_number],
  ['Category', (_, x) => x.category],
  ['Stage', (_, x) => x.stage],
  ['Status', (p) => p.status],
  ['Applied', (p) => p.applied_date],
  ['Issued', (p) => p.issued_date],
  ['Finished', (p) => p.completed_date ?? p.fields?.['Inquiry Results']?.['Date Completed']],
  ['Application type', (p) => p.app_type],
  ['Subtype', (p) => p.subtype],
  ['Work type', (p) => p.work_type],
  ['Work description', (p) => p.description],
  ['Value', (p) => p.valuation],
  ['Address', (p) => p.address],
  ['ZIP', (p) => p.zip],
  ['Owner', (p) => p.owner_name],
  ['Owner mailing address', (p) => p.owner_address],
  ['Contractor company', (p) => p.contractor_company],
  ['Contractor contact', (p) => p.contractor_name],
  ['Contractor phone', (p) => p.contractor_phone],
  ['Contractor license', (p) => p.contractor_license],
  ['Contractor address', (p) => p.contractor_address],
  ['Good lead for', (p) => p.tags.map((t) => TRADE_INFO[t].label).join('; ')],
  ['City record', (p) => p.detail_url],
];

function cell(v: unknown) {
  if (v == null) return '';
  let s = String(v).replace(/\r?\n/g, ' ');
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // keep spreadsheets from treating text as a formula
  return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

let index: ReturnType<typeof buildIndex> | null = null;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const params = readParams((k) => url.searchParams.get(k));
  const since = url.searchParams.get('since');
  // Saved permits live in the browser, so the page sends their IDs along.
  const ids = url.searchParams.get('ids');
  const savedIds = params.saved ? new Set((ids ?? '').split(',').filter(Boolean).slice(0, 2000)) : null;
  const recs = searchRecords();
  index ??= buildIndex(recs);
  const byId = new Map(recs.map((r) => [r.id, r]));
  const { hits } = runSearch(index, recs, byId, params, { now: new Date(), lastVisit: since && !Number.isNaN(Date.parse(since)) ? since : null, savedIds });

  const lines = [COLUMNS.map(([h]) => h).join(',')];
  for (const { rec } of hits) {
    const p = getPermit(rec.id);
    if (!p) continue;
    const extra = { category: rec.ca.map((c) => CATEGORY_LABEL[c]).join('; '), stage: STAGE_LABEL[rec.sg] };
    lines.push(COLUMNS.map(([, get]) => cell(get(p, extra))).join(','));
  }
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse('\uFEFF' + lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="sarasota-permits-${date}.csv"`,
    },
  });
}
