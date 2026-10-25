import { NextResponse } from 'next/server';
import { dataUpdatedAt, searchRecords } from '@/lib/permits';

// Built once per deploy (each daily import redeploys), then served from Netlify's CDN.
export const dynamic = 'force-static';

export function GET() {
  return NextResponse.json(
    { updatedAt: dataUpdatedAt(), recs: searchRecords() },
    { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400' } },
  );
}
