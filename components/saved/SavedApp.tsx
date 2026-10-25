'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Rec } from '@/lib/search-core';
import { CATEGORY_LABEL, STAGE_LABEL } from '@/lib/classify';
import { ResultList } from '@/components/search/SearchApp';
import { refreshSaved, useSaved, type Saved } from './store';

function csv(list: Saved[]) {
  const cols: [string, (s: Saved) => string | number | null | undefined][] = [
    ['Application ID', (s) => s.id],
    ['Saved on', (s) => s.sv.slice(0, 10)],
    ['Address', (s) => s.ad],
    ['ZIP', (s) => s.zp],
    ['Category', (s) => s.ca.map((c) => CATEGORY_LABEL[c]).join('; ')],
    ['Stage', (s) => STAGE_LABEL[s.sg]],
    ['Status', (s) => s.st],
    ['Applied', (s) => s.ap],
    ['Finished', (s) => s.co],
    ['Value', (s) => s.va],
    ['Contractor', (s) => s.cn],
    ['Owner', (s) => s.ow],
    ['Work description', (s) => s.de],
    ['Link', (s) => `${window.location.origin}/permits/${encodeURIComponent(s.id)}`],
  ];
  const cell = (v: unknown) => {
    const t = v == null ? '' : String(v);
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return [cols.map(([h]) => h).join(','), ...list.map((s) => cols.map(([, f]) => cell(f(s))).join(','))].join('\r\n');
}

function download(list: Saved[]) {
  const url = URL.createObjectURL(new Blob(['﻿' + csv(list)], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `saved-permits-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function SavedApp() {
  const saved = useSaved();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    // Bring stored copies up to date (stage, finished date) from today's data.
    fetch('/api/search-index')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { recs?: Rec[] } | null) => d?.recs && refreshSaved(new Map(d.recs.map((r) => [r.id, r]))))
      .catch(() => {});
  }, []);

  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Saved permits</h1>
          <p className="mt-1 text-sm text-ink-2">Kept in this browser only. Nobody else can see this list, and it doesn&apos;t follow you to other devices.</p>
        </div>
        {saved.length > 0 && (
          <button type="button" className="btn-ghost" onClick={() => download(saved)}>
            Download CSV
          </button>
        )}
      </div>

      {!ready ? null : saved.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-semibold">Nothing saved yet</p>
          <p className="mt-1 text-sm text-ink-2">Tap the star on any permit in the search results, or Save on a permit&apos;s page.</p>
          <Link href="/" className="btn-primary mt-4">
            Search permits
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted">
            {saved.length} saved · newest first · tap a star to remove
          </p>
          <ResultList hits={saved.map((rec) => ({ rec, terms: [], score: 0 }))} lastVisit={null} />
        </>
      )}
    </main>
  );
}
