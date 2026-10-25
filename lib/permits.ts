import 'server-only';
import permitsFile from '@/data/permits.json';
import type { Trade } from './trades';
import { toRec, type Rec } from './search-core';

/** A permit as stored in data/permits.json by the scraper. */
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
  completed_date?: string | null;
  expiration_date?: string | null;
  address: string | null;
  city?: string | null;
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
  parcel_address?: string | null;
  legal_description?: string | null;
  review_status?: string | null;
  plans_review_status?: string | null;
  fields?: Record<string, Record<string, string>> | null;
  detail_failures?: number | null;
  valuation: number | null;
  tags: Trade[];
  tag_reasons: Partial<Record<Trade, string>>;
  detail_url: string | null;
  first_seen_at: string;
};

type FileShape = {
  updatedAt: string | null;
  lastRun: { started_at?: string; finished_at: string; listed: number; inserted: number; updated: number; error: string | null } | null;
  permits: Partial<Permit>[];
};

const file = permitsFile as unknown as FileShape;

let cache: { permits: Permit[]; byId: Map<string, Permit>; recs: Rec[] } | null = null;

function load() {
  if (cache) return cache;
  const permits = (file.permits ?? []).map(
    (p) =>
      ({
        permit_number: null,
        work_type: null,
        description: null,
        issued_date: null,
        zip: null,
        owner_name: null,
        owner_address: null,
        contractor_company: null,
        contractor_name: null,
        contractor_phone: null,
        contractor_license: null,
        valuation: null,
        detail_url: null,
        tags: [],
        tag_reasons: {},
        ...p,
        id: p.id ?? p.app_id,
        first_seen_at: p.first_seen_at ?? file.updatedAt ?? '',
      }) as Permit,
  );
  cache = {
    permits,
    byId: new Map(permits.map((p) => [p.app_id, p])),
    recs: permits.map((p) => toRec(p as unknown as Record<string, unknown> & { app_id: string })),
  };
  return cache;
}

export const allPermits = () => load().permits;
export const getPermit = (appId: string) => load().byId.get(appId) ?? null;
/** Compact records for the search index. */
export const searchRecords = () => load().recs;
export const lastRun = () => file.lastRun;
export const dataUpdatedAt = () => file.lastRun?.finished_at ?? file.updatedAt;
/** Permits first seen after this were added by the latest import ("New today"). */
export const latestImportStartedAt = () => {
  const run = file.lastRun;
  if (!run) return null;
  // Older runs didn't record a start time; imports finish well within 3 hours.
  return run.started_at ?? new Date(new Date(run.finished_at).getTime() - 3 * 3_600_000).toISOString();
};

export const portalUrl = (p: Pick<Permit, 'detail_url'>) => p.detail_url ?? 'https://ftgportal.sarasotafl.gov/Permits/Search.aspx?microapp=c';
