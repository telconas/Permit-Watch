// Turns the city's permit types, statuses and free-text descriptions into clean categories and
// stages. Pure functions: used by the website, the search index and the CSV export alike.

export type CategoryId =
  | 'ac'
  | 'remodel'
  | 'plumbing'
  | 'roofing'
  | 'windows'
  | 'electrical'
  | 'solar'
  | 'pool'
  | 'fence'
  | 'tree'
  | 'landscape'
  | 'new'
  | 'demolition'
  | 'docks'
  | 'outdoor'
  | 'signs'
  | 'utilities'
  | 'other';

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'ac', label: 'AC & heating' },
  { id: 'remodel', label: 'Remodel & addition' },
  { id: 'plumbing', label: 'Plumbing' },
  { id: 'roofing', label: 'Roofing' },
  { id: 'windows', label: 'Windows & doors' },
  { id: 'electrical', label: 'Electrical' },
  { id: 'solar', label: 'Solar & generators' },
  { id: 'pool', label: 'Pool & screen' },
  { id: 'fence', label: 'Fence' },
  { id: 'tree', label: 'Tree' },
  { id: 'signs', label: 'Signs' },
  { id: 'outdoor', label: 'Sheds, decks & awnings' },
  { id: 'landscape', label: 'Landscape & hardscape' },
  { id: 'new', label: 'New construction' },
  { id: 'demolition', label: 'Demolition' },
  { id: 'docks', label: 'Docks & seawalls' },
  { id: 'utilities', label: 'Right-of-way & utilities' },
  { id: 'other', label: 'Other' },
];

export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])) as Record<CategoryId, string>;

export function isCategory(v: unknown): v is CategoryId {
  return typeof v === 'string' && v in CATEGORY_LABEL;
}

export type PermitText = {
  app_type?: string | null;
  subtype?: string | null;
  work_type?: string | null;
  description?: string | null;
};

/**
 * A new pool or spa. Deliberately strict: "pool sub panel", "pool heater gas line" and
 * "palm roots cracking the pool lines" mention a pool but are electrical, plumbing and tree jobs.
 */
export const NEW_POOL =
  /\b(IN-?GROUND|SWIMMING|NEW( CONSTRUCTION)?|RESIDENTIAL|GUNITE|FIBERGLASS|CONCRETE)\s+(SWIMMING\s+)?POOL\b|^\W*(\*+[^*]*\*+\s*)?(POOL|SPA)\b(?!\s*(SUB|PANEL|EQUIPMENT|HEATER|PUMP|LINES?|LIGHT|BONDING|GAS|ELECTRIC))|\bPOOL\s*(,|AND|&|\/|\+)\s*(SPA|DECK|PAVER)|\b(INSTALL(ATION)?|BUILD|CONSTRUCT(ION)?)\s+(OF\s+)?(AN?\s+)?(NEW\s+)?(IN-?GROUND\s+|SWIMMING\s+)?(POOL|SPA)\b(?!\s*(SUB|PANEL|EQUIPMENT|HEATER|PUMP|LINES?|LIGHT|BONDING|GAS|ELECTRIC))/;

const SCREEN = /SCREEN\s*(ENCLOSURE|ROOM|CAGE)|\bRE-?SCREEN|POOL CAGE/;
const POOL_REPAIR = /\bCOPING\b|POOL\s+(RESURFAC|DECK|REMODEL|RENOVAT|REPAIR|TILE)|RESURFAC\w*\s+(THE\s+)?POOL|RE-?PLASTER/;
const NEW_BUILDING =
  /\bNEW\s+(SINGLE[- ]FAMILY|SFR|SFH|SFD|RESIDENCE|RESIDENTIAL\s+(HOME|BUILDING)|HOME|HOUSE|DUPLEX|TOWNHOMES?|TOWNHOUSES?|CONDO|MULTI-?FAMILY|COMMERCIAL BUILDING|BUILDING)\b|\bBUILD\s+(A\s+)?NEW\s+(RESIDENTIAL\s+)?(HOME|HOUSE|RESIDENCE)|\bNEW\s+CONSTRUCTION\b(?!\s+POOL)/;

type P = Required<PermitText>;
/** sub: decided by the city's own type/subtype (strongest). text: found in the description. */
type Rule = { id: CategoryId; sub?: (p: P) => boolean; text?: (t: string, p: P) => boolean };

const up = (s: string | null | undefined) => (s ?? '').toUpperCase();
const kind = (p: P) => up(p.app_type) + ' | ' + up(p.subtype);

const RULES: Rule[] = [
  { id: 'utilities', sub: (p) => /^ENGINEERING/.test(up(p.app_type)) },
  { id: 'tree', sub: (p) => /TREE/.test(kind(p)), text: (t) => /\bTREES?\b|\bPALMS?\b|\bARBOR/.test(t) },
  { id: 'demolition', sub: (p) => /DEMOLITION/.test(kind(p) + up(p.work_type)), text: (t) => /\bDEMO(LISH|LITION)?\b/.test(t) },
  { id: 'new', text: (t, p) => (/^NEW - (RESIDENTIAL|COMMERCIAL)/.test(up(p.work_type)) && !NEW_POOL.test(t) && !/POOL/.test(up(p.subtype)) && !/^ENGINEERING/.test(up(p.app_type))) || NEW_BUILDING.test(t) || /\bSTAGING\b.*\b(SFH|SFR|SINGLE[- ]FAMILY|CONDO|RESIDENCE|HOME|CONSTRUCTION)\b/.test(t) },
  { id: 'pool', sub: (p) => /\bPOOL\b/.test(up(p.subtype)), text: (t) => NEW_POOL.test(t) || SCREEN.test(t) || POOL_REPAIR.test(t) },
  { id: 'fence', sub: (p) => /FENCE/.test(up(p.subtype)), text: (t) => /\bFENC(E|ES|ING)\b/.test(t) },
  { id: 'roofing', sub: (p) => /ROOF/.test(up(p.subtype)), text: (t, p) => /REROOF/.test(up(p.work_type)) || /\bRE[- ]?ROOF|ROOF\s+(REPLACEMENT|REPAIR|OVER|RECOVER)|\bRECOVER\b[^.]{0,20}\bROOF|NEW ROOF\b|FLAT ROOF|MODIFIED BITUMEN|\bSHINGLES?\b|METAL ROOF|\bTPO\b/.test(t) },
  { id: 'ac', sub: (p) => /AC CHANGE|HVAC|MECHANICAL/.test(up(p.subtype)), text: (t) => /\bHVAC\b|\bA\/?C\b|AIR[- ]CONDITION|HEAT PUMP|MINI[- ]?SPLIT|AIR HANDLER|CONDENSER|DUCT ?WORK/.test(t) },
  { id: 'solar', text: (t) => /\bSOLAR\b|PHOTOVOLTAIC|\bPV\b|GENERATOR|GENERAC|BATTERY (BACKUP|STORAGE)|POWERWALL/.test(t) && !/SOLAR POWERED (ALPR|CAMERA)/.test(t) },
  { id: 'electrical', sub: (p) => /ELECTRIC|FIRE ALARM/.test(up(p.subtype)), text: (t) => /\bELECTRICAL\b|\bPANEL\b|\bSUB ?PANEL|CIRCUIT|\bEV CHARG|\bWIRING\b|LIGHTING|\b\d+ ?AMP\b|\bOUTLETS?\b|\bSWITCH(ES)?\b|RECEPTACLES?|CHANDEL?I?ERS?|CHANDLERS?|LIGHT FIXTURES?|CAMERAS?\b|LOW VOLTAGE/.test(t) },
  { id: 'plumbing', sub: (p) => /PLUMBING/.test(up(p.subtype)), text: (t) => /PLUMBING|RE-?PIPE|WATER HEATER|\bSEWER|\bGAS (LINE|PIPING|PIPE)|\bGAS\b[^.]{0,30}\bPIP(E|ES|ING)\b|GAS METER|WATER (SERVICE|MAIN|LINE)|BACKFLOW|\bTOILET|\bSHOWER VALVE|WATER SOFTENER|RE-?DRAIN/.test(t) },
  { id: 'windows', sub: (p) => /WINDOW|DOOR/.test(up(p.subtype)), text: (t) => /\bWINDOWS?\b|\bDOORS?\b|SHUTTERS?|SLIDING GLASS|\bIMPACT\b|STOREFRONT/.test(t) },
  { id: 'docks', text: (t) => /\bDOCK|BOAT ?LIFT|SEAWALL|SEA WALL|\bPIER\b|\bDAVIT|BOARDWALK|RIP ?RAP/.test(t) },
  {
    id: 'remodel',
    text: (t) =>
      /REMODEL|RENOVAT|\bKITCHEN|\bBATH(ROOM)?S?\b|INTERIOR|BUILD-?\s?OUT|\bADDITION\b|DRYWALL|CABINET|\bSHOWER|SIDING|\bSTUCCO|FLOORING|CONVERSION|TENANT IMPROVEMENT|\bTILE\b/.test(t),
  },
  { id: 'signs', sub: (p) => /SIGN/.test(up(p.subtype)), text: (t) => /\bSIGNS?\b|SIGNAGE|CHANNEL LETTERS|\bLETTERS\b|MONUMENT SIGN/.test(t) },
  { id: 'outdoor', text: (t) => /\bSHED\b|AWNING|CANOPY|PERGOLA|CARPORT|METAL BUILDING|\bGAZEBO|\bDECK\b|\bGARAGE\b|SUMMER KITCHEN|OUTDOOR KITCHEN|STAIRS?\b|BALCON|\bRAILINGS?\b/.test(t) },
  { id: 'landscape', text: (t) => /ARTIFICIAL TURF|\bTURF\b|\bSOD\b|LANDSCAP|IRRIGATION|PAVERS?\b|DRIVEWAY|RETAINING WALL|HARDSCAPE|GRADING|\bSIDEWALK|\bPATIO\b/.test(t) },
];

/** All categories that fit, most certain first. Never empty: falls back to "other". */
export function categorize(input: PermitText): CategoryId[] {
  const p: P = {
    app_type: input.app_type ?? '',
    subtype: input.subtype ?? '',
    work_type: input.work_type ?? '',
    description: input.description ?? '',
  };
  const text = up(p.description);
  // The city's own subtype is the strongest signal, so it goes first: an "Electrical" permit for a
  // pool heat pump is electrical, even though the description mentions a heat pump.
  const fromType = RULES.filter((r) => r.sub?.(p)).map((r) => r.id);
  const fromText = RULES.filter((r) => r.text?.(text, p)).map((r) => r.id);
  const hits = [...new Set([...fromType, ...fromText])];
  const set = new Set(hits);
  // A new home's windows, wiring and AC aren't separate jobs; a pool's paver deck isn't landscaping.
  if (set.has('new')) for (const id of ['windows', 'electrical', 'plumbing', 'roofing', 'remodel', 'ac', 'outdoor'] as CategoryId[]) set.delete(id);
  if (set.has('pool')) set.delete('landscape');
  const ordered = hits.filter((id) => set.has(id));
  if (ordered.length) return ordered;
  // Last resort for the city's catch-all "Construction Permit": an alteration is most likely a remodel.
  if (/CONSTRUCTION PERMIT/.test(up(p.subtype)) && /^(ALTERATION|ADDITION|REPAIR)/.test(up(p.work_type))) return ['remodel'];
  return ['other'];
}

// ------------------------------------------------------------------ stages

export type StageId = 'filed' | 'approved' | 'underway' | 'finished' | 'inactive';

export const STAGES: { id: StageId; label: string; hint: string }[] = [
  { id: 'filed', label: 'New filing', hint: 'Applied, in plan review' },
  { id: 'approved', label: 'Approved', hint: 'Plans approved, permit not yet issued' },
  { id: 'underway', label: 'Work underway', hint: 'Permit issued, inspections in progress' },
  { id: 'finished', label: 'Finished', hint: 'Passed final inspection' },
  { id: 'inactive', label: 'Withdrawn', hint: 'Withdrawn, cancelled or expired' },
];

export const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.id, s.label])) as Record<StageId, string>;

export function isStage(v: unknown): v is StageId {
  return typeof v === 'string' && v in STAGE_LABEL;
}

export function stageOf(status: string | null | undefined): StageId {
  const s = up(status);
  if (/CLOSED|FINAL(ED)?\b|COMPLETE/.test(s)) return 'finished';
  if (/WITHDRAW|CANCEL|EXPIRE|VOID|DENIED|REVOKED/.test(s)) return 'inactive';
  if (/ISSUED|INSPECTION|CONTRACTOR ACTION|CERTIFICATE/.test(s)) return 'underway';
  // \b keeps "Plan Disapproved" out of approved.
  if (/\bAPPROVED|COMMENCEMENT/.test(s)) return 'approved';
  return 'filed';
}
