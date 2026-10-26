'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Welcome / how-to popup. To add the walkthrough video later, set VIDEO to a YouTube or Vimeo
 * embed URL (e.g. 'https://www.youtube-nocookie.com/embed/VIDEO_ID') or a direct .mp4 link.
 */
const VIDEO: string | null = null;

const STEPS = [
  {
    title: 'Pick your trade and your area',
    body: 'Set "Good lead for" to your trade and choose your ZIP code. That narrows hundreds of permits to the jobs that leave work for you.',
  },
  {
    title: 'Check "New today" each morning',
    body: 'The site pulls every new City of Sarasota permit automatically each morning. Ten minutes with your coffee is enough.',
  },
  {
    title: 'Open a permit for the details',
    body: 'See the work being done, the property owner and their mailing address, the contractor and their phone, plus Maps and Zillow links.',
  },
  {
    title: 'Star the good ones, then reach out',
    body: 'Tap the star to save a lead. Your saved list stays private in your browser, and you can download it as a spreadsheet.',
  },
];

const IDEAS = [
  ['A pool just passed final inspection', 'the yard around it is torn up'],
  ['New impact windows went in', 'the trim and stucco need finishing'],
  ['A roof was replaced', 'gutters and flower beds took a beating'],
  ['A new home is going up', 'it needs sod, irrigation, paint and blinds'],
];

const TIPS = [
  ['Talk about the project, not the permit.', '“Congratulations on your new pool” lands well; “we saw your permit” doesn’t.'],
  ['Watch the Finished stage.', 'Right after a final inspection is when owners want the follow-on work done.'],
  ['Mail and door hangers for homeowners.', 'Save phone calls for businesses like builders and pool companies.'],
  ['Work the whole street.', 'Search the street of a job you’ve won and visit the neighbors with active permits.'],
];

const TRADES: [string, string][] = [
  ['landscaping', 'Landscaping'],
  ['painting', 'Painting'],
  ['fence', 'Fence'],
  ['pool', 'Pool & screen'],
  ['gutters', 'Gutters'],
  ['blinds', 'Blinds & shutters'],
];

function Video({ src }: { src: string }) {
  return (
    <div className="aspect-video overflow-hidden rounded-xl bg-ink">
      {/\.(mp4|webm)(\?|$)/i.test(src) ? (
        <video src={src} controls playsInline preload="metadata" className="h-full w-full" />
      ) : (
        <iframe src={src} title="How to use Permit Watch" className="h-full w-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
      )}
    </div>
  );
}

export function HowItWorks() {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  const show = () => {
    ref.current?.showModal();
    setOpen(true);
  };
  const close = () => ref.current?.close();

  // Keep the page behind from scrolling while the popup is open.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={show} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold whitespace-nowrap text-ink-2 hover:bg-ground sm:px-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand" aria-hidden="true">
          <circle cx="12" cy="12" r="9.5" />
          <path d="M9.5 9.2a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.3-2.5 3.9" />
          <path d="M12 17.2h.01" />
        </svg>
        <span className="sm:hidden">Help</span>
        <span className="hidden sm:inline">How it works</span>
      </button>

      <dialog
        ref={ref}
        aria-labelledby="hiw-title"
        onClose={() => setOpen(false)}
        // A click on the dimmed area outside the card closes it.
        onClick={(e) => e.target === e.currentTarget && close()}
        className="hiw relative m-auto max-h-[92dvh] w-[min(680px,calc(100vw-24px))] overflow-hidden rounded-2xl bg-card p-0 text-ink shadow-2xl backdrop:bg-ink/55 backdrop:backdrop-blur-[2px]"
      >
        <button type="button" onClick={close} aria-label="Close" className="absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-brand/80 text-white hover:bg-brand-dark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
        <div className="flex max-h-[92dvh] flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {/* Welcome */}
          <div className="relative overflow-hidden bg-brand px-6 pt-7 pb-6 text-white sm:px-8">
            <svg className="pointer-events-none absolute -right-10 -bottom-16 h-56 w-56 text-white/[0.07]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm-1 7V3.5L18.5 9z" />
            </svg>
            <p className="font-mono text-[11px] tracking-[0.2em] text-white/70 uppercase">Welcome</p>
            <h2 id="hiw-title" className="mt-2 max-w-md text-[26px] leading-tight font-bold sm:text-3xl">
              Find your next jobs before your competitors do
            </h2>
            <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-white/85">
              Every building permit is a property owner spending money on their home right now. Most of those projects leave work for another trade, and the
              permit tells you where and when.
            </p>
          </div>

          <div className="px-6 py-6 sm:px-8">
            {VIDEO && (
              <div className="mb-6">
                <Video src={VIDEO} />
              </div>
            )}

            {/* Steps */}
            <h3 className="text-lg font-bold">How to use it</h3>
            <ol className="mt-3 grid gap-3 sm:grid-cols-2">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-3 rounded-xl bg-ground p-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand font-display text-sm font-bold text-white">{i + 1}</span>
                  <div>
                    <p className="leading-snug font-semibold">{s.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-2">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            {/* Where the leads are */}
            <h3 className="mt-7 text-lg font-bold">Where the leads hide</h3>
            <ul className="mt-2 divide-y divide-line">
              {IDEAS.map(([when, then]) => (
                <li key={when} className="flex items-baseline gap-2 py-2 text-[15px]">
                  <span className="text-hot" aria-hidden="true">→</span>
                  <span>
                    <span className="font-semibold">{when}:</span> <span className="text-ink-2">{then}.</span>
                  </span>
                </li>
              ))}
            </ul>

            {/* Best practices */}
            <h3 className="mt-7 text-lg font-bold">Best practices</h3>
            <ul className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {TIPS.map(([head, body]) => (
                <li key={head} className="flex gap-2.5 text-sm leading-relaxed">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-brand" aria-hidden="true">
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                  <span>
                    <span className="font-semibold text-ink">{head}</span> <span className="text-ink-2">{body}</span>
                  </span>
                </li>
              ))}
            </ul>

            {/* Quick start */}
            <div className="mt-7 rounded-xl border border-brand/25 bg-brand-soft p-4">
              <p className="font-semibold text-brand-dark">Jump straight to the leads for your trade</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {TRADES.map(([id, label]) => (
                  <a
                    key={id}
                    href={`/?lead=${id}`}
                    className="inline-flex min-h-10 items-center rounded-full border border-brand/30 bg-card px-3.5 text-sm font-medium text-brand-dark hover:border-brand hover:bg-white"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line px-6 py-4 sm:px-8">
            <p className="hidden text-xs text-muted min-[400px]:block">Free to use. No sign-up.</p>
            <button type="button" onClick={close} className="btn-primary ml-auto whitespace-nowrap">
              Start searching
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
