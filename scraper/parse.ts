// Parsers for the City of Sarasota FastTrackGov (FTG) permit portal.
// They work on rendered text (element.innerText), which survives most markup changes.

const SECTION_HEADINGS = new Set([
  'Inquiry Results',
  'Parcel Info',
  'Legal Owner and Description (current)',
  'Permit Info',
  'Description of Work',
  'Additional Building Information',
  'Contact Info',
  'Owner Information',
  'Fee Simple Title Holder Information',
  'Architect Information',
  'Engineer Information',
  'Mortgage Lender Information',
  'Local Contact Information',
  'Special Inspector Information',
  'Contractor',
  'Primary Contractor Information',
  'Zoning App.',
  'Zoning Information',
  'Review',
  'Administrative',
  'Plans Review',
  'Inspections',
  'Transmittals',
]);

const isLabel = (line: string) => /[:?]$/.test(line) || line === 'Public/Private';

/** Turns the inquiry page text into { "Section|Label": "value" }. */
export function parseLabeledText(text: string): Record<string, string> {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: Record<string, string> = {};
  let section = 'Inquiry Results';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (SECTION_HEADINGS.has(line)) {
      section = line;
      continue;
    }
    if (!isLabel(line)) continue;
    const label = line.replace(/[:?]$/, '').trim();
    const values: string[] = [];
    while (i + 1 < lines.length && !isLabel(lines[i + 1]) && !SECTION_HEADINGS.has(lines[i + 1])) {
      values.push(lines[++i]);
    }
    const key = `${section}|${label}`;
    if (!(key in out)) out[key] = values.join('\n');
  }
  return out;
}

export type PermitDetail = {
  app_id: string | null;
  permit_number: string | null;
  applied_date: string | null;
  issued_date: string | null;
  address: string | null;
  city: string | null;
  zip: string | null;
  owner_name: string | null;
  owner_address: string | null;
  work_type: string | null;
  description: string | null;
  valuation: number | null;
  contractor_company: string | null;
  contractor_name: string | null;
  contractor_phone: string | null;
  contractor_license: string | null;
  review_status: string | null;
};

const clean = (v?: string) => {
  const s = (v ?? '').replace(/,\s*$/, '').trim();
  return s.length ? s : null;
};

/** MM/DD/YYYY → YYYY-MM-DD */
export function toIsoDate(v?: string | null): string | null {
  const m = (v ?? '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

export function toNumber(v?: string | null): number | null {
  const s = (v ?? '').replace(/[$,\s]/g, '');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseInquiry(text: string): PermitDetail {
  const f = parseLabeledText(text);
  const get = (section: string, label: string) => clean(f[`${section}|${label}`]);
  const zip = get('Parcel Info', 'Zip Code');
  return {
    app_id: get('Inquiry Results', 'Application ID'),
    permit_number: get('Inquiry Results', 'Permit Number'),
    applied_date: toIsoDate(get('Inquiry Results', 'Date Applied')),
    issued_date: toIsoDate(get('Inquiry Results', 'Date Issued')),
    address: get('Parcel Info', 'Site Address') ?? get('Parcel Info', 'Parcel Address'),
    city: get('Parcel Info', 'City'),
    zip: zip ? zip.slice(0, 5) : null,
    owner_name: get('Owner Information', 'Name') ?? get('Legal Owner and Description (current)', 'Owner Name(s)'),
    owner_address: get('Owner Information', 'Address') ?? get('Legal Owner and Description (current)', 'Owner(s) address'),
    work_type: get('Description of Work', 'Work Type'),
    description: get('Description of Work', 'Work Description'),
    valuation: toNumber(get('Description of Work', 'Total Construction Amt')),
    contractor_company: get('Primary Contractor Information', 'Company'),
    contractor_name: get('Primary Contractor Information', 'Name'),
    contractor_phone: get('Primary Contractor Information', 'Phone'),
    contractor_license: get('Primary Contractor Information', 'State Cert/Reg #'),
    review_status: get('Administrative', 'Status'),
  };
}

export type ListRow = {
  app_id: string;
  app_type: string;
  subtype: string;
  applied_date: string | null;
  status: string;
  address: string;
  source_guid: string | null;
};

/** One results-grid row: cell texts plus the Inquiry link href. */
export function parseListRow(cells: string[], href: string | null): ListRow | null {
  const [app_id, app_type, subtype, applied, status, address] = cells.map((c) => c.trim());
  if (!app_id || !/^\d{4}-\d+/.test(app_id)) return null;
  const guid = href?.match(/[?&]id=([0-9a-f-]{36})/i)?.[1] ?? null;
  return {
    app_id,
    app_type: app_type ?? '',
    subtype: subtype ?? '',
    applied_date: toIsoDate(applied),
    status: status ?? '',
    address: address ?? '',
    source_guid: guid,
  };
}
