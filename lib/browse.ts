import type { PermitQuery } from './permits';
import { isTrade, type Trade } from './trades';

export type BrowseParams = { q?: string; days?: string; min?: string; trade?: string; zip?: string; page?: string; layout?: string; tagged?: string };

export const DAY_OPTIONS = [
  { value: '0', label: 'Any date' },
  { value: '1', label: 'Today' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

export const VALUE_OPTIONS = [
  { value: '0', label: 'Any value' },
  { value: '10000', label: '$10k+' },
  { value: '50000', label: '$50k+' },
  { value: '250000', label: '$250k+' },
];

/** Turns URL parameters into a permit query. Shared by the open browser and the CSV export. */
export function parseBrowse(sp: BrowseParams) {
  const days = Math.max(0, Number(sp.days ?? 0) || 0);
  const minValue = Math.max(0, Number(sp.min ?? 0) || 0);
  const trade: Trade | null = isTrade(sp.trade) ? sp.trade : null;
  const zip = /^\d{5}$/.test(sp.zip ?? '') ? sp.zip! : '';
  const q = (sp.q ?? '').slice(0, 80);
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const layout: 'cards' | 'table' = sp.layout === 'cards' ? 'cards' : 'table';
  const taggedOnly = sp.tagged === '1';
  const query: PermitQuery = { q, days: days || undefined, minValue: minValue || undefined, trade, zips: zip ? [zip] : undefined, taggedOnly };
  return { days, minValue, trade, zip, q, page, layout, taggedOnly, query };
}

export function browseHref(base: string, current: ReturnType<typeof parseBrowse>, over: Partial<Record<keyof BrowseParams, string>> = {}) {
  const merged: Record<string, string> = {
    q: current.q,
    days: current.days ? String(current.days) : '',
    min: current.minValue ? String(current.minValue) : '',
    trade: current.trade ?? '',
    zip: current.zip,
    layout: current.layout === 'table' ? '' : current.layout,
    tagged: current.taggedOnly ? '1' : '',
    page: '',
    ...over,
  };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
  const s = params.toString();
  return s ? `${base}?${s}` : base;
}
