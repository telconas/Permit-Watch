export const TRADES = ['landscaping', 'fence', 'pool', 'gutters', 'blinds'] as const;
export type Trade = (typeof TRADES)[number];

export const TRADE_INFO: Record<Trade, { label: string; blurb: string }> = {
  landscaping: { label: 'Landscaping & sod', blurb: 'New homes, additions, demolitions, tree and site work' },
  fence: { label: 'Fence', blurb: 'New builds, demolitions, pools that need a barrier, storm damage' },
  pool: { label: 'Pool & screen enclosure', blurb: 'New homes and pool permits that often need enclosures or resurfacing' },
  gutters: { label: 'Gutters', blurb: 'Re-roofs, new roofs, additions, storm damage' },
  blinds: { label: 'Blinds & shutters', blurb: 'New homes, remodels, window and door replacements' },
};

export function isTrade(value: unknown): value is Trade {
  return typeof value === 'string' && (TRADES as readonly string[]).includes(value);
}

// ZIP codes that overlap the City of Sarasota limits. Users can add others.
export const SARASOTA_ZIPS = ['34230', '34231', '34232', '34233', '34234', '34235', '34236', '34237', '34239', '34242', '34243'];
