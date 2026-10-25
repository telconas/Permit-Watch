export function money(n: number | null | undefined) {
  if (n == null) return null;
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function shortDate(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function longDate(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function timeAgo(iso: string | null | undefined) {
  if (!iso) return 'never';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 36) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  return `${Math.round(hrs / 24)} days ago`;
}

/** "ALTERATIONS/REPAIRS - RESIDENTIAL" → "Alterations/Repairs - Residential" */
export function titleCase(s: string | null | undefined) {
  if (!s) return '';
  return s.toLowerCase().replace(/(^|[\s/(-])([a-z])/g, (_, a, b) => a + b.toUpperCase());
}

const KEEP_UPPER = new Set(
  'AC A/C HVAC SFR SFH SFD PVC LED ROW FPL TECO KW BTU BTUS SEER SEER2 EV PV TPO GFCI GFI AHU HP LLC INC USA FL US II III IV ADA CMU ATS ALPR UAS'.split(' '),
);

/**
 * Descriptions arrive in ALL CAPS about half the time. Turns those into sentence case and keeps
 * trade acronyms ("HVAC", "A/C", "SEER2") as they are. Mixed-case text is left alone.
 */
export function readable(s: string | null | undefined) {
  if (!s) return '';
  const letters = s.replace(/[^A-Za-z]/g, '');
  if (!letters || letters.replace(/[^A-Z]/g, '').length / letters.length < 0.7) return s;
  const lower = s.toLowerCase().replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, a, b) => a + b.toUpperCase());
  const kept = lower.replace(/\b[a-z][a-z0-9/]*\b/gi, (w) => (KEEP_UPPER.has(w.toUpperCase()) ? w.toUpperCase() : w));
  return kept.replace(/[a-z]/, (c) => c.toUpperCase());
}

/** "Oct 25, 9:51 AM" in Sarasota time. */
export function easternDateTime(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Zillow's address search. Lands on the home's own page when Zillow knows the address,
 * otherwise on search results for it.
 */
export function zillowUrl(address: string | null | undefined, zip?: string | null, city = 'Sarasota') {
  if (!address) return null;
  const slug = [address, city, `FL ${zip ?? ''}`.trim()]
    .map((part) => part.replace(/[^A-Za-z0-9#\- ]+/g, ' ').trim().replace(/\s+/g, '-'))
    .filter(Boolean)
    .join(',-');
  return `https://www.zillow.com/homes/${encodeURIComponent(slug).replace(/%2C/g, ',')}_rb/`;
}
