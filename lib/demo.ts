import 'server-only';
import { cookies } from 'next/headers';
import type { Permit } from './permits';
import type { Profile } from './session';
import { tagPermit } from './tags';
import { isTrade, type Trade } from './trades';
import permitsFile from '@/data/permits.json';

/**
 * Demo mode: when Supabase isn't configured, the app runs on sample data so you can
 * click through every page locally. Nothing here touches a database, Stripe or email.
 */
export const isDemo = () => !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;

const COOKIE = 'pw_demo';

type DemoState = { signedIn: boolean; trade: Trade | null; zips: string[]; digest: boolean; subscribed: boolean };
const EMPTY: DemoState = { signedIn: false, trade: null, zips: [], digest: true, subscribed: false };

export async function readDemo(): Promise<DemoState> {
  try {
    const raw = (await cookies()).get(COOKIE)?.value;
    if (!raw) return EMPTY;
    const s = JSON.parse(raw) as Partial<DemoState>;
    return {
      signedIn: !!s.signedIn,
      trade: isTrade(s.trade) ? s.trade : null,
      zips: Array.isArray(s.zips) ? s.zips.map(String).slice(0, 25) : [],
      digest: s.digest !== false,
      subscribed: !!s.subscribed,
    };
  } catch {
    return EMPTY;
  }
}

/** Only callable from server actions and route handlers. */
export async function writeDemo(patch: Partial<DemoState> | null) {
  const store = await cookies();
  if (patch === null) {
    store.delete(COOKIE);
    return;
  }
  const next = { ...(await readDemo()), ...patch };
  store.set(COOKIE, JSON.stringify(next), { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 });
}

export async function demoSession() {
  const s = await readDemo();
  if (!s.signedIn) return null;
  const profile: Profile = {
    id: 'demo-user',
    email: 'demo@example.com',
    trade: s.trade,
    zips: s.zips,
    digest_enabled: s.digest,
    stripe_customer_id: s.subscribed ? 'cus_demo' : null,
    subscription_status: s.subscribed ? 'active' : null,
    current_period_end: s.subscribed ? new Date(Date.now() + 30 * 86_400_000).toISOString() : null,
  };
  return { user: { id: profile.id, email: profile.email }, profile };
}

// ------------------------------------------------------------------ sample data
// Invented records shaped like the city's real ones. Dates are relative to today.

type Seed = [string, number, string, string, string, string, string, string, number | null, string, string];
// app_id, days ago, app type, subtype, work type, description, address, zip, value, status, contractor
const SEEDS: Seed[] = [
  ['2027-000912', 0, 'Building and Zoning', 'Construction Permit', 'NEW CONSTRUCTION - RESIDENTIAL', 'NEW SINGLE FAMILY RESIDENCE, 2 STORY WITH ATTACHED GARAGE', '1834 HILLVIEW ST', '34239', 684000, 'Pending Plan Review', 'SAMPLE HOMES LLC'],
  ['2027-000908', 0, 'Over the Counter Permit', 'Roofing', 'ALTERATIONS/REPAIRS - RESIDENTIAL', 'REROOF, TILE TO STANDING SEAM METAL, 32 SQ', '2210 BAHIA VISTA ST', '34239', 38900, 'Pending Plan Review', 'SAMPLE ROOFING CO'],
  ['2027-000903', 0, 'Building and Zoning', 'Pool', 'NEW CONSTRUCTION - RESIDENTIAL', 'INGROUND POOL AND SPA WITH PAVER DECK', '1255 SIESTA DR', '34239', 96000, 'Pending Plan Review', 'SAMPLE POOLS INC'],
  ['2027-000899', 1, 'Over the Counter Permit', 'Windows', 'ALTERATIONS/REPAIRS - RESIDENTIAL', 'REPLACE 14 WINDOWS AND 1 SLIDING GLASS DOOR, SAME SIZE', '740 S OSPREY AVE', '34236', 31250, 'Pending Plan Review', 'SAMPLE WINDOW & DOOR'],
  ['2027-000894', 1, 'Building and Zoning', 'Construction Permit', 'ADDITION - RESIDENTIAL', 'MASTER SUITE ADDITION 420 SF, REAR OF HOUSE', '3120 GROVE ST', '34237', 142000, 'Pending Plan Review', 'SAMPLE BUILDERS'],
  ['2027-000887', 1, 'Tree Permit', 'Tree Permit', '', 'REMOVE 2 LAUREL OAKS, REPLANT 2 LIVE OAKS', '1620 GILLESPIE AVE', '34236', null, 'Pending Review', ''],
  ['2027-000881', 2, 'Building and Zoning', 'Demolition', 'DEMOLITION - RESIDENTIAL', 'DEMOLISH SINGLE FAMILY RESIDENCE AND POOL', '4415 BAY SHORE RD', '34234', 18000, 'Pending Plan Review', 'SAMPLE DEMOLITION'],
  ['2027-000876', 2, 'Over the Counter Permit', 'Screen Enclosure', 'ALTERATIONS/REPAIRS - RESIDENTIAL', 'NEW ALUMINUM SCREEN ENCLOSURE OVER EXISTING POOL', '2788 WOOD ST', '34237', 22400, 'Issued', 'SAMPLE ALUMINUM'],
  ['2027-000870', 3, 'Over the Counter Permit', 'Electrical', 'ALTERATIONS/REPAIRS - RESIDENTIAL', 'ELECTRICAL SERVICE UPGRADE TO 400A', '1407 RINGLING BLVD', '34236', 9600, 'Issued', 'SAMPLE ELECTRIC'],
  ['2027-000862', 3, 'Building and Zoning', 'Construction Permit', 'ALTERATIONS/REPAIRS - RESIDENTIAL', 'KITCHEN AND BATH REMODEL, NO STRUCTURAL', '1990 HIGHLAND ST', '34236', 57000, 'Pending Plan Corrections', 'SAMPLE REMODELING'],
  ['2027-000855', 4, 'Private Provider', 'Construction Permit', 'NEW CONSTRUCTION - RESIDENTIAL', 'NEW SINGLE FAMILY RESIDENCE WITH POOL', '508 N TAMIAMI CIR', '34234', 912000, 'Pending Plan Review', 'SAMPLE CUSTOM HOMES'],
  ['2027-000849', 5, 'Over the Counter Permit', 'Roofing', 'ALTERATIONS/REPAIRS - RESIDENTIAL', 'RE-ROOF SHINGLE, 24 SQ', '3625 JACINTO CT', '34239', 17200, 'Issued', 'SAMPLE ROOFING CO'],
  ['2027-000841', 6, 'Over the Counter Permit', 'Plumbing', 'ALTERATIONS/REPAIRS - RESIDENTIAL', 'WATER HEATER REPLACEMENT, SAME LOCATION', '1628 7TH ST', '34236', 2100, 'Issued', 'SAMPLE PLUMBING'],
  ['2027-000833', 8, 'Storm Damage/Hurricane Permit', 'Storm Damage', 'ALTERATIONS/REPAIRS - RESIDENTIAL', 'STORM DAMAGE REPAIR: FASCIA, SOFFIT AND FENCE', '2455 ALTA VISTA ST', '34237', 14800, 'Pending Plan Review', 'SAMPLE RESTORATION'],
  ['2027-000826', 11, 'Building and Zoning', 'Construction Permit', 'NEW CONSTRUCTION - RESIDENTIAL', 'NEW TOWNHOME BUILDING, 4 UNITS', '1450 MORRILL ST', '34236', 1840000, 'Pending Plan Review', 'SAMPLE DEVELOPMENT'],
  ['2027-000818', 14, 'Over the Counter Permit', 'Doors', 'ALTERATIONS/REPAIRS - RESIDENTIAL', 'REPLACE FRONT ENTRY DOOR AND 2 FRENCH DOORS', '35 S BOULEVARD OF THE PRESIDENTS', '34236', 12900, 'Issued', 'SAMPLE WINDOW & DOOR'],
];

let cached: Permit[] | null = null;

export function demoPermits(): Permit[] {
  if (cached) return cached;
  cached = SEEDS.map(([app_id, ago, app_type, subtype, work_type, description, address, zip, valuation, status, contractor], i) => {
    const applied = new Date(Date.now() - ago * 86_400_000);
    const { tags, reasons } = tagPermit({ app_type, subtype, work_type, description });
    return {
      id: `demo-${i}`,
      app_id,
      permit_number: status === 'Issued' ? `BLD${app_id.replace('-', '')}` : null,
      app_type,
      subtype,
      work_type: work_type || null,
      description,
      status,
      applied_date: applied.toISOString().slice(0, 10),
      issued_date: status === 'Issued' ? applied.toISOString().slice(0, 10) : null,
      address,
      zip,
      owner_name: '[Sample owner]',
      owner_address: '[Sample mailing address]\nSARASOTA FL',
      contractor_company: contractor || null,
      contractor_name: contractor ? '[Sample contractor contact]' : null,
      contractor_phone: contractor ? '(941) 555-0100' : null,
      contractor_license: contractor ? 'CXC000000' : null,
      valuation,
      tags,
      tag_reasons: reasons,
      detail_url: null,
      first_seen_at: new Date(applied.getTime() + 18 * 3_600_000).toISOString(),
    };
  });
  return cached;
}

// ------------------------------------------------------------------ scraped JSON file
// With no database, the site shows what `npm run scrape:json` saved to data/permits.json.
// If that file is still empty, it falls back to the sample permits above.

type FileShape = {
  updatedAt: string | null;
  lastRun: { finished_at: string; inserted: number; updated: number; error: string | null } | null;
  permits: Partial<Permit>[];
};

let fromFile: Permit[] | null = null;

function filePermits(): Permit[] {
  if (fromFile) return fromFile;
  const file = permitsFile as unknown as FileShape;
  fromFile = (file.permits ?? []).map(
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
        first_seen_at: p.first_seen_at ?? new Date().toISOString(),
      }) as Permit,
  );
  return fromFile;
}

/** True when the site is showing invented sample permits rather than scraped ones. */
export const usingSamplePermits = () => filePermits().length === 0;

export function localPermits(): Permit[] {
  return usingSamplePermits() ? demoPermits() : filePermits();
}

export function localLastRun() {
  if (usingSamplePermits()) {
    const today = new Date();
    today.setHours(5, 42, 0, 0);
    return { finished_at: today.toISOString(), inserted: 3, updated: 9, error: null };
  }
  return (permitsFile as unknown as FileShape).lastRun;
}

/**
 * Open access: anyone can browse every permit and detail page, no sign-in or paywall.
 * OPEN_ACCESS=true forces it on, OPEN_ACCESS=false forces it off; unset, it's on until
 * accounts (Supabase) are connected.
 */
export function openAccess() {
  const flag = process.env.OPEN_ACCESS?.toLowerCase();
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return isDemo();
}
