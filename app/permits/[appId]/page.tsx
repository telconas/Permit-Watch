import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPermit, portalUrl } from '@/lib/permits';
import { TRADE_INFO } from '@/lib/trades';
import { CATEGORY_LABEL, STAGE_LABEL, categorize } from '@/lib/classify';
import { toRec } from '@/lib/search-core';
import { longDate, money, readable, titleCase } from '@/lib/format';
import { BackLink } from '@/components/BackLink';

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
const digits = (phone: string | null | undefined) => (phone ?? '').replace(/\D/g, '').slice(-10);

export async function generateMetadata({ params }: { params: Promise<{ appId: string }> }): Promise<Metadata> {
  const p = getPermit(decodeURIComponent((await params).appId));
  if (!p) return { title: 'Permit not found' };
  const what = CATEGORY_LABEL[categorize(p)[0]];
  return {
    title: `${what} permit at ${p.address ?? 'unknown address'}, Sarasota · ${p.app_id}`,
    // Permit pages carry owner names: keep them out of search engines (see README).
    robots: { index: false, follow: true },
  };
}

export default async function PermitPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params;
  const p = getPermit(decodeURIComponent(appId));
  if (!p) notFound();
  const rec = toRec(p as unknown as Parameters<typeof toRec>[0]);
  const categories = rec.ca;
  const stage = rec.sg;
  const completed = rec.co;
  const ownerPhone = p.fields?.['Owner Information']?.['Phone'] ?? null;

  const city = titleCase(p.city) || 'Sarasota';
  const fullAddress = [p.address, `${city}, FL ${p.zip ?? ''}`.trim()].filter(Boolean).join(', ');
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
  const sections = Object.entries(p.fields ?? {});

  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:px-6">
      <BackLink permitId={p.app_id} />

      <header className="card p-5 sm:p-8">
        <p className="font-mono text-sm text-ink-2">
          Application {p.app_id}
          {p.permit_number ? ` · Permit ${p.permit_number}` : ''}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold">{p.address}</h1>
        <p className="mt-1 text-lg text-ink-2">{fullAddress}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {categories.map((c) => (
            <span key={c} className="rounded-md bg-brand-soft px-2 py-0.5 font-semibold text-brand-dark">
              {CATEGORY_LABEL[c]}
            </span>
          ))}
          <span className="rounded-md bg-ground px-2 py-0.5 font-semibold text-ink-2">{STAGE_LABEL[stage]}</span>
          <span className="py-0.5 text-ink-2">{[p.app_type, p.subtype].filter(Boolean).join(' · ')}</span>
        </div>
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

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            ['Status', p.status],
            ['Applied', longDate(p.applied_date)],
            ['Issued', longDate(p.issued_date) || 'Not yet'],
            ['Finished', completed ? longDate(completed) : stage === 'inactive' ? '—' : 'Not yet'],
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
            <h2 className="text-base font-bold">Good lead for</h2>
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
        <Row label="Work description">{readable(p.description)}</Row>
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
        <Row label="Phone listed for owner">
          {ownerPhone ? (
            <>
              {ownerPhone}
              {digits(ownerPhone) === digits(p.contractor_phone) && (
                <span className="ml-2 text-sm text-muted">(same as the contractor&apos;s number, so probably not the homeowner)</span>
              )}
            </>
          ) : null}
        </Row>
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
            {(p.detail_failures ?? 0) >= 3
              ? "The city's portal doesn't show the full record for this application type, so only the details from the search list are available."
              : 'The full record for this permit hasn’t been read yet. The next daily import fills it in automatically. Until then, the city record link above has the full page.'}
          </p>
        )}
      </section>

      <p className="text-xs text-muted">
        Copied from the City of Sarasota permit portal. Verify on the city record before acting.
      </p>
    </main>
  );
}
