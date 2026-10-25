'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { recalledSearch } from './search/nav';

/**
 * Back to the search this permit was opened from. If the visitor got here by clicking a result,
 * it steps back in history (filters and scroll position intact); otherwise it links to that search,
 * or to the search page.
 */
export function BackLink({ permitId }: { permitId: string }) {
  const [href, setHref] = useState('/');
  const [cameFromResult, setCameFromResult] = useState(false);

  useEffect(() => {
    const nav = recalledSearch();
    if (!nav) return;
    setHref(nav.url || '/');
    setCameFromResult(nav.permit === permitId && window.history.length > 1);
  }, [permitId]);

  return (
    <Link
      href={href}
      onClick={(e) => {
        if (cameFromResult) {
          e.preventDefault();
          window.history.back();
        }
      }}
      className="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline"
    >
      ← Back to search
    </Link>
  );
}
