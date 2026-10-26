import type { Trade } from './trades';
import { NEW_POOL } from './classify';

export type PermitForTagging = {
  app_type?: string | null;
  subtype?: string | null;
  work_type?: string | null;
  description?: string | null;
};

export type TagResult = { tags: Trade[]; reasons: Partial<Record<Trade, string>> };

type Fields = { app_type: string; subtype: string; work_type: string; description: string };
type Rule = { reason: string; test: (t: string, p: Fields) => boolean; trades: Trade[] };

const has = (s: string, re: RegExp) => re.test(s);

// Plain, readable rules. A tag means "likely follow-on work", never a confirmed job.
// Order matters only for the reason text: the first rule that adds a trade explains it.
const RULES: Rule[] = [
  {
    reason: 'New home',
    trades: ['landscaping', 'fence', 'pool', 'gutters', 'blinds', 'painting'],
    test: (t, p) =>
      has(t, /\bNEW (SINGLE[- ]FAMILY|SFR|SFD|SFH|RESIDENCE|HOME|DUPLEX|TOWNHOME|TOWNHOUSE)\b|\bBUILD (A )?NEW (RESIDENTIAL )?(HOME|HOUSE|RESIDENCE)\b/) ||
      // A new pool's work type is also "NEW - RESIDENTIAL", so that alone isn't a new home.
      (has(p.work_type.toUpperCase(), /\bNEW\b/) &&
        has(p.work_type.toUpperCase(), /RESIDENTIAL/) &&
        !/\bPOOL\b/.test(p.subtype.toUpperCase()) &&
        !NEW_POOL.test(p.description.toUpperCase()) &&
        !has(t, /\b(FENCE|SHED|DOCK|SEAWALL|BOAT ?LIFT|PERGOLA|GENERATOR|SOLAR|DRIVEWAY)\b/)),
  },
  {
    reason: 'Addition',
    trades: ['landscaping', 'gutters', 'blinds', 'painting'],
    // A pool/deck addition isn't an addition to the house.
    test: (t, p) => has(t, /\bADDITION\b/) && !has(t, /ADDITIONAL/) && !NEW_POOL.test(p.description.toUpperCase()) && !has(t, /\b(POOL|DECK|LANAI)\s*(\/\s*DECK\s*)?ADDITION/),
  },
  {
    reason: 'Demolition',
    trades: ['fence', 'landscaping'],
    test: (t) => has(t, /\bDEMO(LITION|LISH)?\b/),
  },
  {
    reason: 'New pool or spa',
    trades: ['fence', 'landscaping', 'pool'],
    // Strict: "pool sub panel" or "palm roots cracking the pool lines" is not a pool job.
    test: (t, p) => /\bPOOL\b/.test(p.subtype.toUpperCase()) || NEW_POOL.test(p.description.toUpperCase()) || has(t, /\bHOT TUB\b/),
  },
  {
    reason: 'Screen enclosure',
    trades: ['pool'],
    test: (t) => has(t, /SCREEN (ENCLOSURE|ROOM|CAGE)|LANAI/),
  },
  {
    reason: 'Roof work',
    trades: ['gutters'],
    test: (t, p) => has(p.subtype.toUpperCase(), /ROOF/) || has(t, /\bRE-?ROOF|ROOF REPLACEMENT|NEW ROOF\b/),
  },
  {
    reason: 'Window or door replacement',
    trades: ['blinds', 'painting'],
    test: (t, p) => has(p.subtype.toUpperCase(), /WINDOW|DOOR/) || has(t, /\bWINDOWS?\b|SLIDING (GLASS )?DOOR/),
  },
  {
    reason: 'Remodel',
    trades: ['blinds', 'painting'],
    test: (t) => has(t, /\bREMODEL|RENOVAT|INTERIOR BUILD[- ]?OUT/),
  },
  {
    reason: 'Hurricane shutters',
    trades: ['blinds'],
    test: (t) => has(t, /SHUTTER/),
  },
  {
    reason: 'Tree or site work',
    trades: ['landscaping'],
    test: (t, p) => has(p.app_type.toUpperCase(), /TREE/) || has(t, /\bTREE|GRADING|IRRIGATION|SOD\b|LANDSCAP|DRAINAGE|SITE ?WORK/),
  },
  {
    reason: 'Storm damage repair',
    trades: ['fence', 'gutters', 'landscaping', 'painting'],
    test: (t, p) => has(p.app_type.toUpperCase(), /STORM|HURRICANE/) || has(t, /STORM DAMAGE|HURRICANE DAMAGE/),
  },
  {
    reason: 'Painting in the scope',
    trades: ['painting'],
    // "Painted" usually describes an existing surface ("mounted to the painted wall"), and murals are art commissions.
    test: (t) => has(t, /\b(RE)?PAINT(ING)?\b/) && !has(t, /\bMURAL/),
  },
  {
    reason: 'Concrete or balcony restoration',
    trades: ['painting'],
    // Condo structural repairs end with a repaint of the building.
    test: (t) => has(t, /CONCRETE (RESTORATION|REPAIRS?)|SPALL|BALCON(Y|IES) (REPAIR|RESTOR)|WATERPROOFING|MILESTONE INSPECTION/),
  },
  {
    reason: 'Stucco, drywall or siding work',
    trades: ['painting'],
    // Stucco only when it's being worked on: "gas line at the exterior stucco wall" doesn't count.
    // Prefab sheds come finished from the factory.
    test: (t) =>
      !has(t, /\bSHED\b/) &&
      (has(t, /\bSTUCCO (REPAIRS?|WORK|PATCH\w*|REPLACE\w*|SYSTEM)\b|\b(REPAIR|REPLACE|PATCH|NEW|APPLY|RE-?)\w* (OF |EXTERIOR |LIMITED |THE )*STUCCO\b/) ||
        has(t, /\b(DRYWALL|SHEETROCK|SOFFITS?|FASCIA)\b/) ||
        // New vinyl siding is never painted; Hardie board and PVC siding are.
        (has(t, /\bSIDING\b/) && !has(t, /\b(WITH|NEW|INSTALL\w*)\b[A-Z\- ]*\bVINYL SIDING\b/))),
  },
  {
    reason: 'Fence permit',
    trades: ['landscaping'],
    test: (t, p) => has(p.subtype.toUpperCase(), /FENCE/) || has(t, /\bFENCE\b/),
  },
];

export function tagPermit(input: PermitForTagging): TagResult {
  const p: Fields = {
    app_type: input.app_type ?? '',
    subtype: input.subtype ?? '',
    work_type: input.work_type ?? '',
    description: input.description ?? '',
  };
  const text = [p.app_type, p.subtype, p.work_type, p.description].join(' ').toUpperCase();
  const reasons: Partial<Record<Trade, string>> = {};
  for (const rule of RULES) {
    if (!rule.test(text, p)) continue;
    for (const trade of rule.trades) reasons[trade] ??= rule.reason;
  }
  return { tags: Object.keys(reasons) as Trade[], reasons };
}
