'use client';
import Link from 'next/link';
import type { Rec } from '@/lib/search-core';
import { isSaved, toggleSaved, useSaved } from './store';

function Star({ filled, className = '' }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-5 w-5 ${className}`} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round">
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
    </svg>
  );
}

/** "Save" / "Saved" button for the permit page. */
export function SaveButton({ rec }: { rec: Rec }) {
  const saved = isSaved(useSaved(), rec.id);
  return (
    <button type="button" className={saved ? 'btn border border-brand bg-brand-soft text-brand-dark' : 'btn-ghost'} aria-pressed={saved} onClick={() => toggleSaved(rec)}>
      <Star filled={saved} className={saved ? 'text-brand' : 'text-muted'} />
      {saved ? 'Saved' : 'Save'}
    </button>
  );
}

/** Small star toggle for result rows. */
export function SaveStar({ rec, className = '' }: { rec: Rec; className?: string }) {
  const saved = isSaved(useSaved(), rec.id);
  const label = `${saved ? 'Remove' : 'Save'} ${rec.ad || rec.id}${saved ? ' from' : ' to'} your saved permits`;
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={label}
      title={saved ? 'Saved (click to remove)' : 'Save'}
      onClick={() => toggleSaved(rec)}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-brand-soft ${saved ? 'text-brand' : 'text-muted hover:text-brand'} ${className}`}
    >
      <Star filled={saved} />
    </button>
  );
}

/** Header link with the count of saved permits. */
export function SavedLink() {
  const n = useSaved().length;
  return (
    <Link href="/saved" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-ink-2 hover:bg-ground">
      <Star filled={n > 0} className={n > 0 ? 'text-brand' : 'text-muted'} />
      Saved{n > 0 && <span className="rounded-full bg-brand px-1.5 text-xs leading-5 text-white tabular-nums">{n}</span>}
    </Link>
  );
}
