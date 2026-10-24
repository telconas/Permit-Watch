import Link from 'next/link';
import type { Permit } from '@/lib/permits';
import { TRADE_INFO } from '@/lib/trades';
import { money, shortDate, titleCase } from '@/lib/format';

const th = 'px-3 py-2.5 text-left text-xs font-semibold tracking-wide text-muted uppercase whitespace-nowrap';
const td = 'px-3 py-3 align-top';

export function PermitTable({ permits, newCutoff }: { permits: Permit[]; newCutoff: number }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[1100px] border-collapse text-sm">
        <thead className="bg-ground">
          <tr>
            <th scope="col" className={th}>Application</th>
            <th scope="col" className={th}>Applied</th>
            <th scope="col" className={th}>Status</th>
            <th scope="col" className={th}>Type</th>
            <th scope="col" className={th}>Address</th>
            <th scope="col" className={th}>Work description</th>
            <th scope="col" className={`${th} text-right`}>Value</th>
            <th scope="col" className={th}>Contractor</th>
            <th scope="col" className={th}>Owner</th>
            <th scope="col" className={th}>Tags</th>
          </tr>
        </thead>
        <tbody>
          {permits.map((p) => (
            <tr key={p.app_id} className="border-t border-line hover:bg-ground/60">
              <td className={td}>
                <Link href={`/permits/${encodeURIComponent(p.app_id)}`} className="font-mono font-medium text-brand underline-offset-2 hover:underline">
                  {p.app_id}
                </Link>
                {new Date(p.first_seen_at).getTime() > newCutoff && (
                  <span className="ml-2 rounded bg-hot px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white">NEW</span>
                )}
              </td>
              <td className={`${td} whitespace-nowrap`}>{shortDate(p.applied_date)}</td>
              <td className={`${td} whitespace-nowrap`}>{p.status}</td>
              <td className={td}>
                <div className="whitespace-nowrap">{p.subtype || p.app_type}</div>
                {p.subtype && p.app_type && <div className="text-xs text-muted">{p.app_type}</div>}
              </td>
              <td className={td}>
                <div className="font-medium whitespace-nowrap">{p.address}</div>
                <div className="text-xs text-muted">{p.zip}</div>
              </td>
              <td className={`${td} max-w-[320px] text-ink-2`}>{titleCase(p.description)}</td>
              <td className={`${td} text-right whitespace-nowrap tabular-nums`}>{money(p.valuation)}</td>
              <td className={td}>
                <div className="whitespace-nowrap">{p.contractor_company}</div>
                {p.contractor_phone && <div className="text-xs whitespace-nowrap text-muted">{p.contractor_phone}</div>}
              </td>
              <td className={`${td} max-w-[200px]`}>{p.owner_name}</td>
              <td className={td}>
                <div className="flex flex-wrap gap-1">
                  {p.tags.map((t) => (
                    <span key={t} title={p.tag_reasons?.[t]} className="rounded bg-brand-soft px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap text-brand-dark">
                      {TRADE_INFO[t].label}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
