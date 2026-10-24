import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isSubscribed, requireSession } from '@/lib/session';
import { getPermit, portalUrl } from '@/lib/permits';
import { TRADE_INFO } from '@/lib/trades';
import { openAccess } from '@/lib/demo';
import { longDate, money, titleCase } from '@/lib/format';

export const dynamic = 'force-dynamic';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  if (children == null || children === '' || children === false) return null;
  return (
    <div className="grid gap-1 border-t border-line py-3 first:border-t-0 sm:grid-cols-[200px_1fr]">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="whitespace-pre-line break-words">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      <dl className="mt-2">{children}</dl>
    </section>
  );
}

const tel = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

export default async function PermitPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params;
  if (!openAccess()) {
    const { profile } = await requireSession(`/permits/${appId}`);
    if (!isSubscribed(profile)) redirect('/dashboard');
  }
  const p = await getPermit(decodeURIComponent(appId));
  if (!p) notFound();

  const city = titleCase(p.city) || 'Sarasota';
  const fullAddress = [p.address, `${city}, FL ${p.zip ?? ''}`.trim()].filter(Boolean).join(', ');
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
  const sections = Object.entries(p.fields ?? {});

  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:px-6">
      <Link href="/dashboard" className="text-sm font-semibold text-brand hover:underline">
        ← Back to permits
      </Link>

      <header className="card p-5 sm:p-8">
        <p className="font-mono text-sm text-ink-2">
          Application {p.app_id}
          {p.permit_number ? ` · Permit ${p.permit_number}` : ''}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold">{p.address}</h1>
        <p className="mt-1 text-lg text-ink-2">{fullAddress}</p>
        <p className="mt-2 text-ink-2">{[p.app_type, p.subtype].filter(Boolean).join(' · ')}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a className="btn-primary" href={maps} target="_blank" rel="noreferrer">
            Open in Maps
          </a>
          <a className="btn-ghost" href={portalUrl(p)} target="_blank" rel="noreferrer">
            City record
          </a>
          {p.contractor_phone && (
            <a className="btn-ghost" href={tel(p.contractor_phone)}>
              Call contractor
            </a>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ['Status', p.status],
            ['Applied', longDate(p.applied_date)],
            ['Issued', longDate(p.issued_date) || 'Not yet'],
            ['Declared value', money(p.valuation) ?? '—'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-ground p-3">
              <p className="text-xs text-muted">{label}</p>
              <p className="mt-0.5 font-semibold">{value || '—'}</p>
            </div>
          ))}
        </div>

        {p.tags.length > 0 && (
          <div className="mt-5 rounded-lg bg-hot-soft p-4">
            <h2 className="text-base font-bold">Why it was tagged</h2>
            <ul className="mt-1 space-y-0.5 text-sm">
              {p.tags.map((t) => (
                <li key={t}>
                  <span className="font-semibold">{TRADE_INFO[t].label}:</span> {p.tag_reasons?.[t] ?? 'Matched rule'}
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>

      <Section title="Work">
        <Row label="Work description">{p.description}</Row>
        <Row label="Work type">{titleCase(p.work_type)}</Row>
        <Row label="Application type">{p.app_type}</Row>
        <Row label="Subtype">{p.subtype}</Row>
        <Row label="Administrative review">{p.review_status}</Row>
        <Row label="Plans review">{p.plans_review_status}</Row>
      </Section>

      <Section title="Property">
        <Row label="Site address">{fullAddress}</Row>
        <Row label="Parcel address">{p.parcel_address && p.parcel_address !== p.address ? p.parcel_address : null}</Row>
        <Row label="Legal description">{p.legal_description}</Row>
        <Row label="Owner">{p.owner_name}</Row>
        <Row label="Owner mailing address">{p.owner_address}</Row>
      </Section>

      <Section title="Contractor">
        <Row label="Company">{p.contractor_company}</Row>
        <Row label="Contact">{p.contractor_name}</Row>
        <Row label="Phone">
          {p.contractor_phone ? (
            <a className="font-semibold text-brand underline" href={tel(p.contractor_phone)}>
              {p.contractor_phone}
            </a>
          ) : null}
        </Row>
        <Row label="Fax">{p.contractor_fax}</Row>
        <Row label="State license">{p.contractor_license}</Row>
        <Row label="City registration">{p.contractor_city_registration}</Row>
        <Row label="Business address">{p.contractor_address}</Row>
        <Row label="Mailing address">{p.contractor_mailing_address && p.contractor_mailing_address !== p.contractor_address ? p.contractor_mailing_address : null}</Row>
        {!p.contractor_company && !p.contractor_name && <p className="py-2 text-sm text-muted">No contractor listed on the application.</p>}
      </Section>

      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-bold">Everything on the city record</h2>
        {sections.length ? (
          <div className="mt-3 grid gap-5 md:grid-cols-2">
            {sections.map(([section, values]) => (
              <div key={section}>
                <h3 className="font-sans text-sm font-semibold tracking-wide text-hot uppercase">{section}</h3>
                <dl className="mt-1">
                  {Object.entries(values).map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[minmax(120px,45%)_1fr] gap-2 border-t border-line py-1.5 text-sm first:border-t-0">
                      <dt className="text-muted">{label}</dt>
                      <dd className="whitespace-pre-line break-words">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-2">
            This permit was imported before the scraper saved every field. The next daily import fills it in automatically. Until
            then, the city record link above has the full page.
          </p>
        )}
      </section>

      <p className="text-xs text-muted">
        Copied from the City of Sarasota permit portal. Verify on the city record before acting.
      </p>
    </main>
  );
}
