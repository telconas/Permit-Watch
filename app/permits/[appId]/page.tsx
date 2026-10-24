import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isSubscribed, requireSession } from '@/lib/session';
import { getPermit, portalUrl } from '@/lib/permits';
import { TRADE_INFO } from '@/lib/trades';
import { longDate, money, titleCase } from '@/lib/format';

export const dynamic = 'force-dynamic';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  if (children == null || children === '') return null;
  return (
    <div className="grid gap-1 border-t border-line py-3 sm:grid-cols-[180px_1fr]">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="whitespace-pre-line">{children}</dd>
    </div>
  );
}

export default async function PermitPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params;
  const { profile } = await requireSession(`/permits/${appId}`);
  if (!isSubscribed(profile)) redirect('/dashboard');
  const p = await getPermit(decodeURIComponent(appId));
  if (!p) notFound();

  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.address}, Sarasota, FL ${p.zip ?? ''}`)}`;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/dashboard" className="text-sm font-semibold text-brand hover:underline">
        ← Back to permits
      </Link>
      <div className="mt-4 card p-5 sm:p-8">
        <p className="font-mono text-sm text-ink-2">
          {p.app_id}
          {p.permit_number ? ` · Permit ${p.permit_number}` : ''}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold">{p.address}</h1>
        <p className="mt-1 text-ink-2">
          {[p.app_type, p.subtype, `Sarasota ${p.zip ?? ''}`].filter(Boolean).join(' · ')}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a className="btn-primary" href={maps} target="_blank" rel="noreferrer">
            Open in Maps
          </a>
          <a className="btn-ghost" href={portalUrl(p)} target="_blank" rel="noreferrer">
            City record
          </a>
        </div>

        {p.tags.length > 0 && (
          <section className="mt-6 rounded-lg bg-hot-soft p-4">
            <h2 className="text-base font-bold">Why it was tagged</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {p.tags.map((t) => (
                <li key={t}>
                  <span className="font-semibold">{TRADE_INFO[t].label}:</span> {p.tag_reasons?.[t] ?? 'Matched rule'}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink-2">Tags are likely follow-on work, not confirmed jobs.</p>
          </section>
        )}

        <dl className="mt-6">
          <Row label="Work description">{titleCase(p.description)}</Row>
          <Row label="Work type">{titleCase(p.work_type)}</Row>
          <Row label="Declared value">{money(p.valuation)}</Row>
          <Row label="Status">{p.status}</Row>
          <Row label="Applied">{longDate(p.applied_date)}</Row>
          <Row label="Issued">{longDate(p.issued_date)}</Row>
          <Row label="Owner">{[p.owner_name, p.owner_address].filter(Boolean).join('\n')}</Row>
          <Row label="Contractor">
            {[p.contractor_company, p.contractor_name, p.contractor_license ? `License ${p.contractor_license}` : null].filter(Boolean).join('\n')}
          </Row>
          <Row label="Contractor phone">
            {p.contractor_phone ? (
              <a className="font-semibold text-brand underline" href={`tel:${p.contractor_phone.replace(/[^\d+]/g, '')}`}>
                {p.contractor_phone}
              </a>
            ) : null}
          </Row>
        </dl>
      </div>
      <p className="mt-4 text-xs text-muted">Copied from the City of Sarasota permit portal. Verify on the city record before acting.</p>
    </main>
  );
}
