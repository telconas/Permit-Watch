import { saveSetup } from '@/app/actions';
import { SARASOTA_ZIPS, TRADES, TRADE_INFO, type Trade } from '@/lib/trades';

type Props = {
  trade: Trade | null;
  zips: string[];
  digest: boolean;
  next: string;
  back: string;
  submitLabel: string;
  error?: string;
};

export function SetupForm({ trade, zips, digest, next, back, submitLabel, error }: Props) {
  const extras = zips.filter((z) => !SARASOTA_ZIPS.includes(z));
  return (
    <form action={saveSetup} className="space-y-8">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="back" value={back} />

      <fieldset>
        <legend className="font-display text-xl font-bold">Your trade</legend>
        <p className="mt-1 text-sm text-ink-2">Your matches and morning email follow this trade. You can change it anytime.</p>
        {error === 'trade' && (
          <p className="mt-2 text-sm text-[#a3260f]" role="alert">
            Pick a trade to continue.
          </p>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {TRADES.map((t) => (
            <label
              key={t}
              className="card flex cursor-pointer items-start gap-3 p-4 has-[:checked]:border-brand has-[:checked]:bg-brand-soft"
            >
              <input type="radio" name="trade" value={t} defaultChecked={trade === t} required className="mt-1 h-4 w-4 accent-[#0f5c55]" />
              <span>
                <span className="block font-semibold">{TRADE_INFO[t].label}</span>
                <span className="block text-sm text-ink-2">{TRADE_INFO[t].blurb}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-display text-xl font-bold">ZIP codes you work</legend>
        <p className="mt-1 text-sm text-ink-2">These cover the City of Sarasota. Only permits in your ZIPs count as matches.</p>
        {error === 'zips' && (
          <p className="mt-2 text-sm text-[#a3260f]" role="alert">
            Choose at least one ZIP code.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {SARASOTA_ZIPS.map((z) => (
            <label
              key={z}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line-2 bg-card px-3 font-mono text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand-dark"
            >
              <input type="checkbox" name="zips" value={z} defaultChecked={zips.includes(z)} className="h-4 w-4 accent-[#0f5c55]" />
              {z}
            </label>
          ))}
        </div>
        <label className="mt-4 block text-sm font-medium">
          Other ZIP codes <span className="font-normal text-muted">(comma separated)</span>
          <input name="extraZips" defaultValue={extras.join(', ')} className="field mt-1.5 font-mono" inputMode="numeric" placeholder="34238, 34241" />
        </label>
      </fieldset>

      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" name="digest" defaultChecked={digest} className="h-5 w-5 accent-[#0f5c55]" />
        <span>
          <span className="font-semibold">Email me the 7 AM digest</span>
          <span className="block text-sm text-ink-2">New matches from the morning import, Eastern time.</span>
        </span>
      </label>

      <button type="submit" className="btn-hot w-full sm:w-auto">
        {submitLabel}
      </button>
    </form>
  );
}
