# Permit Watch Sarasota

A free search engine for every City of Sarasota building permit. Type "pool", "kitchen", a company, an owner, an address or a permit number and the results update as you type. Filter by category, stage (new filing, approved, work underway, finished), ZIP, date, value and follow-on lead type, and see what's new since your last visit.

Live: https://permit-watch.netlify.app

## How it works

```
GitHub Actions, every morning ──► scraper/scrape.ts (Playwright drives the city's permit portal)
                                    1. searches All Permits · All statuses · last 30 days
                                    2. pages through the results list
                                    3. opens the detail page of each new or changed permit
                                    4. saves everything to data/permits.json and commits it
Netlify ─── rebuilds on every commit
              /                    instant search (runs in the browser, typo-tolerant)
              /permits/:id         the full city record: owner, contractor, every field
              /api/search-index    the compact search index, built at deploy time
              /api/export          CSV of the current search, all fields
```

There is no database. `data/permits.json` holds the permits; the scraper only ever adds to it and updates it.

## Search details

- **Search** (`lib/search-core.ts`): MiniSearch over address, ZIP, description, contractor, owner, permit type and ID. Prefix matching ("kitch" finds kitchen), one typo in words of 5+ letters, never in numbers. If nothing matches exactly it retries with swapped letters ("remodle") and says it's showing close spellings.
- **Categories and stages** (`lib/classify.ts`): worked out from the city's type, subtype, work type and description. The city's subtype wins over description words. Tests with real descriptions in `lib/classify.test.ts`.
- **Lead tags** (`lib/tags.ts`): likely follow-on work (a re-roof suggests gutters; a new pool suggests fence, landscaping, screen enclosure). Not confirmed jobs.
- **New since your last visit**: remembered in the visitor's own browser; a gap of 30+ minutes starts a new visit. First-time visitors get "New today" instead.
- **Saved permits** (`components/saved/`): the star on a result, or Save on a permit page, adds it to `/saved`. Stored in the visitor's own browser only (localStorage), never sent to the server; the list can be downloaded as CSV. On the search page, the ★ Saved chip (`?saved=1`) narrows any search to saved permits, withdrawn ones included.
- **Zillow**: each permit page links to Zillow's address search for the site address, in a new tab.
- Every search has its own URL (`/?q=pool&cat=pool&stage=finished&zip=34236`), so searches can be bookmarked and shared.
- Permit pages are kept out of Google (`noindex`) because they carry owner names; they stay fully visible and searchable on the site.

## Running it locally

```bash
npm install
npx playwright install chromium   # one time: the browser the scraper drives
npm run scrape                    # update data/permits.json (first run on an empty file: 30-80 minutes)
npm run dev                       # http://localhost:3000
npm test                          # categories, tags, portal parser, data file
```

`npm run scrape:dry` writes to `scraper/output/dry-run.json` instead, leaving the site's data alone. `HEADFUL=1` shows the browser while it works.

## The daily import

`.github/workflows/scrape.yml` runs every morning (GitHub may start scheduled jobs late on quiet repositories) and can be started by hand from the Actions tab. Options when run by hand: search window (`D30`, `M3`, `Y1`), how many detail pages to open, and "refresh details" to re-read every permit.

A permit whose detail page fails is still saved from the results list, and retried on later runs. After 3 failures it's left alone unless its status changes; engineering and utility records never load on the city's own site.

## Changing categories or lead tags

Edit `lib/classify.ts` or `lib/tags.ts`, add a real example to the tests, run `npm test`, then `npm run retag` (lead tags are stored in the data file; categories are worked out when the site builds).

## When the city changes its portal

The scraper finds things by visible text (the "All Permits" option, the "Search" button, the "Next Page" link, labels like "Work Description:") rather than generated ids. The detail parser is tested against saved real pages in `scraper/fixtures/`; save a fresh copy there if the layout changes. A failed run shows in the Actions tab and in `lastRun` at the top of `data/permits.json`.

## Earlier paid version

Sign-in, Stripe subscriptions and the morning email digest were removed when the site became a free directory. They're in the Git history (before commit "Free search engine") if they're needed again.
