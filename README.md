# Permit Watch Sarasota

New City of Sarasota permit applications, tagged for landscaping, fence, pool, gutter and blinds follow-on work, filtered to each subscriber's ZIP codes, with a 7 AM email digest. One plan: $99/month through Stripe.

Modeled on Permit Central Chicago. The big difference: Chicago publishes an open data API, Sarasota does not, so a daily headless-browser import reads the city's FastTrackGov portal.

## Start here: preview with real permits, no database

You can run and demo the whole site with real Sarasota permits before setting up Supabase, Stripe or email. Permits are kept in `data/permits.json`; sign-in and checkout are pretend (a browser cookie), and a banner says so.

**On your PC (Windows, Mac or Linux):**

```bash
npm install
npx playwright install chromium   # one time: the browser the scraper drives
npm run scrape:json               # first run: about 10-20 minutes for the last 30 days
npm run dev                       # open http://localhost:3000
```

Run `npm run scrape:json` again any day to add new applications and refresh changed ones; it only opens the permits that are new or changed, so later runs take a few minutes. Add `HEADFUL=1` to watch the browser work (Windows: `set HEADFUL=1` first). A long run saves as it goes, so stopping it partway keeps what it has.

**As a live demo site that updates itself:**

1. Put the project in a GitHub repository. In Netlify: **Add new site → Import an existing project → GitHub**, pick the repo and deploy. `netlify.toml` already has the build settings, and no environment variables are needed for the preview.
2. In GitHub → Actions → **Daily permit import** → **Run workflow**. It scrapes, commits the updated `data/permits.json`, and that commit makes Netlify redeploy.
3. From then on it runs every morning at 5:30 AM ET by itself.

To pull more history once, run the workflow with window `M3` (3 months) or `Y1` (1 year), or locally `SEARCH_WINDOW=M3 npm run scrape:json`. If a run has more new permits than `MAX_DETAILS` (400), the rest are picked up the next day.

When you're ready for real accounts and payments, follow the setup below. Once the Supabase keys are set, the scraper and the site switch to the database automatically.

## How it fits together

```
GitHub Actions, 5:30 AM ET ──► scraper/scrape.ts (Playwright)
                                 1. runs the portal search: All Permits · All statuses · last 30 days
                                 2. pages through results (20 per page)
                                 3. opens the detail page for each new or changed application
                                 4. tags it (lib/tags.ts) and upserts into Supabase
Netlify ─── Next.js app
             /             public landing page with 6 live permits and pricing
             /login        email magic link (Supabase Auth)
             /onboarding   pick one trade + ZIP codes
             /dashboard    matches or all permits, search and filters; locked preview until subscribed
             /permits/:id  full record: description, value, owner, contractor, city link
             /settings     trade, ZIPs, digest on/off, Stripe billing portal, sign out
             /api/stripe/* checkout, customer portal, webhook
GitHub Actions, 7 AM ET ──► /api/cron/digest  emails each subscriber their new matches (Resend)
```

## Setup (about 30 minutes)

### 1. Supabase
1. Create a project at supabase.com.
2. SQL editor → paste and run `supabase/schema.sql`.
3. Authentication → URL configuration: set **Site URL** to your domain and add `https://YOUR-DOMAIN/auth/callback` (and `http://localhost:3000/auth/callback` for local work) to **Redirect URLs**.
4. Authentication → Emails: Supabase's built-in mailer is rate-limited, so add your own SMTP (Resend works) before launch.
5. Copy the project URL, anon key and service-role key into `.env.local` (start from `.env.example`).

### 2. Stripe
1. Products → add **Permit Watch Sarasota**, recurring price **$99/month**. Copy the price ID into `STRIPE_PRICE_ID`.
2. Settings → Billing → Customer portal: turn on cancel and update payment method.
3. Developers → Webhooks → add endpoint `https://YOUR-DOMAIN/api/stripe/webhook` with events
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
   Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook` and pay with card 4242 4242 4242 4242.

### 3. Resend (morning digest)
Verify your sending domain at resend.com, then set `RESEND_API_KEY` and `DIGEST_FROM_EMAIL`.

### 4. Deploy to Netlify
In Netlify → Site configuration → Environment variables, add every variable from `.env.example` (with `NEXT_PUBLIC_SITE_URL` set to your real domain), then redeploy.

The morning digest is triggered by `.github/workflows/digest.yml`. In GitHub → Settings → Secrets and variables → Actions, add `SITE_URL` (e.g. `https://yoursite.netlify.app`) and `CRON_SECRET` (the same value as in Netlify). It runs at 11:00 UTC, which is 7 AM during daylight time and 6 AM in winter. Until both secrets exist it skips quietly.

Netlify's server functions have a short time limit (seconds, not minutes). Sending from the endpoint is fine for dozens of subscribers; past that, move the sending into the GitHub Action itself.

### 5. The daily import (GitHub Actions)
1. Push the repo to GitHub.
2. Settings → Secrets and variables → Actions: add `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SCRAPER_CONTACT` (an email the city can reach you at; it's sent in the scraper's user agent).
3. Actions → **Daily permit import** → **Run workflow** for the first import. After that it runs at 5:30 AM ET.

The first run opens a detail page for every application in the last 30 days (a few hundred, about 1.5 seconds apart), so it takes 10 to 20 minutes. Later runs only open new or changed records and finish in a few minutes. For a deeper backfill, run once with `SEARCH_WINDOW=M3` or `Y1`.

## Demo mode without any data
If `data/permits.json` is empty and no database is set, the site shows 16 invented sample permits so the pages still have something on them. The banner says which you're looking at.

## Local development

```bash
npm install
npx playwright install chromium
cp .env.example .env.local      # fill in values
npm run scrape:json             # scrape into data/permits.json (what the site shows with no database)
npm run scrape:dry              # test run into scraper/output/dry-run.json; leaves the site's data alone
npm run scrape                  # Supabase if its keys are set, otherwise data/permits.json
npm run dev                     # http://localhost:3000
npm test                        # tagging rules + portal parser
```

`HEADFUL=1 npm run scrape:dry` opens a visible browser so you can watch it work.

## Making someone a subscriber by hand
For testing or comped accounts, run in the Supabase SQL editor:

```sql
update profiles set subscription_status = 'active' where email = 'someone@example.com';
```

## Changing the trade tags
Edit the rules in `lib/tags.ts`, add a case to `lib/tags.test.ts`, run `npm test`, then `npm run retag` to re-apply the rules to every stored permit.

## When the city changes its portal
The scraper finds things by visible text (the "All Permits" option, the "Search" button, the "Next Page" link, labels such as "Work Description:") rather than generated ids. If an import fails, the error lands in the `scrape_runs` table and the landing page shows "Last import had a problem". The detail parser is tested against a saved real page in `scraper/fixtures/`; save a fresh copy there if the layout changes.

## Things to decide before launch
- **Terms and data use.** Read the portal's Legal Notices and add a Terms page and Privacy page. The footer disclaimer says Permit Watch is independent of the city. Consider asking the city's Development Services office whether they offer a bulk export; it would be more stable than scraping.
- **Owner contact details.** Detail pages show owner names and mailing addresses from public records. The app shows them only to paying subscribers. Check that this fits how you want to market it, and remember telemarketing rules apply if subscribers cold-call owners.
- **Coverage.** City of Sarasota only. Sarasota County and Bradenton use different systems and would each need their own scraper module.
