import 'server-only';
import { supabaseAdmin } from './supabase/server';
import type { Trade } from './trades';
import { isDemo, localLastRun, localPermits } from './demo';

export type Permit = {
  id: string;
  app_id: string;
  permit_number: string | null;
  app_type: string | null;
  subtype: string | null;
  work_type: string | null;
  description: string | null;
  status: string | null;
  applied_date: string | null;
  issued_date: string | null;
  address: string | null;
  zip: string | null;
  owner_name: string | null;
  owner_address: string | null;
  contractor_company: string | null;
  contractor_name: string | null;
  contractor_phone: string | null;
  contractor_license: string | null;
  contractor_address?: string | null;
  contractor_mailing_address?: string | null;
  contractor_fax?: string | null;
  contractor_city_registration?: string | null;
  city?: string | null;
  parcel_address?: string | null;
  legal_description?: string | null;
  review_status?: string | null;
  plans_review_status?: string | null;
  fields?: Record<string, Record<string, string>> | null;
  valuation: number | null;
  tags: Trade[];
  tag_reasons: Partial<Record<Trade, string>>;
  detail_url: string | null;
  first_seen_at: string;
};

export type PermitQuery = {
  trade?: Trade | null;
  zips?: string[];
  q?: string;
  days?: number;
  minValue?: number;
  taggedOnly?: boolean;
  limit?: number;
  offset?: number;
};

const LIST_COLUMNS =
  'id,app_id,permit_number,app_type,subtype,work_type,description,status,applied_date,issued_date,address,zip,owner_name,owner_address,contractor_company,contractor_name,contractor_phone,contractor_license,valuation,tags,tag_reasons,detail_url,first_seen_at';

function listDemo(opts: PermitQuery) {
  const since = opts.days ? new Date(Date.now() - opts.days * 86_400_000).toISOString().slice(0, 10) : '';
  const term = (opts.q ?? '').trim().toUpperCase();
  const rows = localPermits()
    .filter((p) => !opts.trade || p.tags.includes(opts.trade))
    .filter((p) => !opts.taggedOnly || p.tags.length > 0)
    .filter((p) => !opts.zips?.length || opts.zips.includes(p.zip ?? ''))
    .filter((p) => !since || (p.applied_date ?? '') >= since)
    .filter((p) => !opts.minValue || (p.valuation ?? 0) >= opts.minValue)
    .filter((p) => !term || [p.address, p.description, p.contractor_company, p.owner_name, p.app_id].some((v) => (v ?? '').toUpperCase().includes(term)));
  const offset = opts.offset ?? 0;
  return { permits: rows.slice(offset, offset + (opts.limit ?? 50)), count: rows.length };
}

export async function listPermits(opts: PermitQuery) {
  if (isDemo()) return listDemo(opts);
  let q = supabaseAdmin()
    .from('permits')
    .select(LIST_COLUMNS, { count: 'exact' })
    .order('applied_date', { ascending: false, nullsFirst: false })
    .order('app_id', { ascending: false });

  if (opts.trade) q = q.contains('tags', [opts.trade]);
  if (opts.taggedOnly) q = q.neq('tags', '{}');
  if (opts.zips?.length) q = q.in('zip', opts.zips);
  if (opts.days) {
    const since = new Date(Date.now() - opts.days * 86_400_000).toISOString().slice(0, 10);
    q = q.gte('applied_date', since);
  }
  if (opts.minValue) q = q.gte('valuation', opts.minValue);
  if (opts.q) {
    // Strip characters PostgREST uses in filter syntax.
    const term = opts.q.replace(/[%,()*\\]/g, ' ').trim();
    if (term) q = q.or(`address.ilike.%${term}%,description.ilike.%${term}%,contractor_company.ilike.%${term}%,owner_name.ilike.%${term}%,app_id.ilike.%${term}%`);
  }
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;
  const { data, count, error } = await q.range(offset, offset + limit - 1);
  if (error) throw error;
  return { permits: (data ?? []) as unknown as Permit[], count: count ?? 0 };
}

export async function getPermit(appId: string) {
  if (isDemo()) return localPermits().find((p) => p.app_id === appId) ?? null;
  const { data } = await supabaseAdmin().from('permits').select('*').eq('app_id', appId).maybeSingle();
  return data as Permit | null;
}

export async function latestRun() {
  if (isDemo()) return localLastRun();
  const { data } = await supabaseAdmin()
    .from('scrape_runs')
    .select('finished_at,inserted,updated,error')
    .not('finished_at', 'is', null)
    .order('finished_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as { finished_at: string; inserted: number; updated: number; error: string | null } | null;
}

export async function feedStats() {
  if (isDemo()) {
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    const rows = localPermits();
    const latest = rows.reduce<string | null>((m, p) => (p.applied_date && (!m || p.applied_date > m) ? p.applied_date : m), null);
    return { last30: rows.filter((p) => (p.applied_date ?? '') >= since).length, latestApplied: latest };
  }
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const { count } = await supabaseAdmin().from('permits').select('id', { count: 'exact', head: true }).gte('applied_date', since);
  const { data } = await supabaseAdmin()
    .from('permits')
    .select('applied_date')
    .order('applied_date', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  return { last30: count ?? 0, latestApplied: (data?.applied_date as string | undefined) ?? null };
}

/** ZIP codes that appear in the data, for the ZIP filter. */
export async function distinctZips(): Promise<string[]> {
  const zips = isDemo()
    ? localPermits().map((p) => p.zip)
    : ((await supabaseAdmin().from('permits').select('zip').not('zip', 'is', null).limit(10000)).data ?? []).map((r) => r.zip as string);
  return [...new Set(zips.filter((z): z is string => !!z))].sort();
}

export const portalUrl = (p: Pick<Permit, 'detail_url'>) => p.detail_url ?? 'https://ftgportal.sarasotafl.gov/Permits/Search.aspx?microapp=c';
