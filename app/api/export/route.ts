import { NextResponse, type NextRequest } from 'next/server';
import { listPermits } from '@/lib/permits';
import { parseBrowse, type BrowseParams } from '@/lib/browse';
import { openAccess } from '@/lib/demo';
import { getSession, isSubscribed } from '@/lib/session';
import { TRADE_INFO } from '@/lib/trades';

export const dynamic = 'force-dynamic';

const COLUMNS: [string, (p: Awaited<ReturnType<typeof listPermits>>['permits'][number]) => unknown][] = [
  ['Application ID', (p) => p.app_id],
  ['Permit number', (p) => p.permit_number],
  ['Applied', (p) => p.applied_date],
  ['Issued', (p) => p.issued_date],
  ['Status', (p) => p.status],
  ['Application type', (p) => p.app_type],
  ['Subtype', (p) => p.subtype],
  ['Work type', (p) => p.work_type],
  ['Work description', (p) => p.description],
  ['Value', (p) => p.valuation],
  ['Address', (p) => p.address],
  ['ZIP', (p) => p.zip],
  ['Owner', (p) => p.owner_name],
  ['Owner address', (p) => p.owner_address],
  ['Contractor company', (p) => p.contractor_company],
  ['Contractor contact', (p) => p.contractor_name],
  ['Contractor phone', (p) => p.contractor_phone],
  ['Contractor license', (p) => p.contractor_license],
  ['Trade tags', (p) => p.tags.map((t) => TRADE_INFO[t].label).join('; ')],
  ['Tag reasons', (p) => p.tags.map((t) => `${TRADE_INFO[t].label}: ${p.tag_reasons?.[t] ?? ''}`).join('; ')],
  ['City record', (p) => p.detail_url],
];

function cell(v: unknown) {
  if (v == null) return '';
  let s = String(v).replace(/\r?\n/g, ' ');
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // keep spreadsheets from treating text as a formula
  return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: NextRequest) {
  if (!openAccess()) {
    const session = await getSession();
    if (!isSubscribed(session?.profile ?? null)) return NextResponse.json({ error: 'Subscribe to export permits.' }, { status: 403 });
  }
  const sp = Object.fromEntries(new URL(request.url).searchParams) as BrowseParams;
  const { query } = parseBrowse(sp);
  const { permits } = await listPermits({ ...query, limit: 10000 });
  const lines = [COLUMNS.map(([h]) => h).join(','), ...permits.map((p) => COLUMNS.map(([, get]) => cell(get(p))).join(','))];
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse('﻿' + lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="sarasota-permits-${date}.csv"`,
    },
  });
}
