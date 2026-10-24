import Link from 'next/link';
import type { Permit } from '@/lib/permits';
import { TRADE_INFO, type Trade } from '@/lib/trades';
import { money, shortDate, titleCase } from '@/lib/format';

type Props = {
  permit: Pick<Permit, 'app_id' | 'applied_date' | 'address' | 'app_type' | 'subtype' | 'zip' | 'description' | 'valuation' | 'tags' | 'tag_reasons' | 'status' | 'first_seen_at'>;
  highlight?: Trade | null;
  href?: string;
  isNew?: boolean;
};

export function PermitCard({ permit: p, highlight, href, isNew }: Props) {
  const tags = highlight && p.tags.includes(highlight) ? [highlight, ...p.tags.filter((t) => t !== highlight)] : p.tags;
  const body = (
    <article className="card flex h-full flex-col gap-3 p-4 transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="font-mono font-medium text-ink-2">{p.app_id}</span>
        <span aria-hidden="true">·</span>
        <span>Applied {shortDate(p.applied_date)}</span>
        {isNew && <span className="rounded bg-hot px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white">NEW</span>}
        {p.status && <span className="ml-auto rounded-full bg-ground px-2 py-0.5 font-medium text-ink-2">{p.status}</span>}
      </div>
      <div>
        <h3 className="font-display text-lg leading-tight font-bold">{p.address}</h3>
        <p className="mt-1 text-sm text-ink-2">
          {[p.subtype || p.app_type, p.zip].filter(Boolean).join(' · ')}
        </p>
      </div>
      {p.description && <p className="line-clamp-3 text-sm text-ink-2">{titleCase(p.description)}</p>}
      <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-1">
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              title={p.tag_reasons?.[t] ? `${p.tag_reasons[t]} → possible ${TRADE_INFO[t].label.toLowerCase()} work` : undefined}
              className={
                t === highlight
                  ? 'rounded-md bg-hot-soft px-2 py-1 text-xs font-semibold text-[#8a3a05]'
                  : 'rounded-md bg-brand-soft px-2 py-1 text-xs font-semibold text-brand-dark'
              }
            >
              {TRADE_INFO[t].label}
              {t === highlight && p.tag_reasons?.[t] ? ` · ${p.tag_reasons[t]}` : ''}
            </span>
          ))}
        </div>
        {p.valuation != null && <span className="font-display text-lg font-bold tabular-nums">{money(p.valuation)}</span>}
      </div>
    </article>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}
