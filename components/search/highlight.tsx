import { Fragment, type ReactNode } from 'react';

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Wraps the matched search words in <mark>. `terms` are the index words that matched. */
export function highlight(text: string, terms: string[]): ReactNode {
  if (!text || !terms.length) return text;
  const words = [...new Set(terms.filter((t) => t.length > 1))].sort((a, b) => b.length - a.length).map(escape);
  if (!words.length) return text;
  const re = new RegExp(`(?<![a-z0-9])(${words.join('|')})(?![a-z0-9])`, 'gi');
  const parts = text.split(re);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded-sm bg-[#ffe7a3] px-0.5 text-ink">
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}
