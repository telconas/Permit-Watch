import type { Trade } from './trades';

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
    trades: ['landscaping', 'fence', 'pool', 'gutters', 'blinds'],
    test: (t, p) =>
      has(t, /\bNEW (SINGLE[- ]FAMILY|SFR|SFD|RESIDENCE|HOME|DUPLEX|TOWNHOME|TOWNHOUSE)\b/) ||
      (has(p.work_type.toUpperCase(), /\bNEW\b/) && has(p.work_type.toUpperCase(), /RESIDENTIAL/)),
  },
  {
    reason: 'Addition',
    trades: ['landscaping', 'gutters', 'blinds'],
    test: (t) => has(t, /\bADDITION\b/) && !has(t, /ADDITIONAL/),
  },
  {
    reason: 'Demolition',
    trades: ['fence', 'landscaping'],
    test: (t) => has(t, /\bDEMO(LITION|LISH)?\b/),
  },
  {
    reason: 'Pool or spa permit',
    trades: ['fence', 'landscaping', 'pool'],
    test: (t) => has(t, /\b(POOL|SPA|HOT TUB)\b/),
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
    trades: ['blinds'],
    test: (t, p) => has(p.subtype.toUpperCase(), /WINDOW|DOOR/) || has(t, /\bWINDOWS?\b|SLIDING (GLASS )?DOOR/),
  },
  {
    reason: 'Remodel',
    trades: ['blinds'],
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
    trades: ['fence', 'gutters', 'landscaping'],
    test: (t, p) => has(p.app_type.toUpperCase(), /STORM|HURRICANE/) || has(t, /STORM DAMAGE|HURRICANE DAMAGE/),
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
