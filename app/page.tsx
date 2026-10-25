import { SearchApp } from '@/components/search/SearchApp';
import { dataUpdatedAt, latestImportStartedAt, searchRecords } from '@/lib/permits';
import { easternDateTime } from '@/lib/format';

// Rebuilt on every deploy, and every daily import triggers a deploy.
export const dynamic = 'force-static';

export default function Home() {
  const recs = searchRecords();
  // The newest permits, in the pre-built page, so results show before the search index loads.
  const initial = [...recs]
    .filter((r) => r.sg !== 'inactive')
    .sort((a, b) => (b.ap ?? '').localeCompare(a.ap ?? '') || b.id.localeCompare(a.id))
    .slice(0, 20);
  const updatedAt = dataUpdatedAt();
  return (
    <SearchApp
      initial={initial}
      total={recs.length}
      newSince={latestImportStartedAt()}
      updatedLabel={easternDateTime(updatedAt) || 'never'}
    />
  );
}
