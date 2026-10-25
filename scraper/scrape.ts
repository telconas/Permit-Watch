/**
 * Daily import from the City of Sarasota permit portal (FastTrackGov).
 *
 *   npm run scrape        # saves to Supabase if its keys are set, otherwise to data/permits.json
 *   npm run scrape:json   # always saves to data/permits.json (what the website reads with no database)
 *   npm run scrape:dry    # test run: saves to scraper/output/dry-run.json, leaves the site's data alone
 *
 * Options (env): SEARCH_WINDOW = D30 | M3 | Y1 (default D30), MAX_PAGES (default 150),
 * MAX_DETAILS (default 1000), DETAIL_DELAY_MS (default 1500), HEADFUL=1 to watch it run,
 * REFRESH_DETAILS=1 to re-read every permit's detail page instead of only new or changed ones.
 */
import './env';
import { chromium, type Page } from 'playwright';
import { isInquiryLoaded, parseInquiry, parseListRow, type ListRow, type PermitDetail } from './parse';
import { tagPermit } from '../lib/tags';
import { JsonStore, SupabaseStore, type RunStats, type Store } from './store';

const BASE = 'https://ftgportal.sarasotafl.gov';
const WINDOW = process.env.SEARCH_WINDOW ?? 'D30';
const WINDOW_LABEL: Record<string, string> = { D30: 'Last 30 day(s)', M3: 'Last 3 month(s)', Y1: 'Last 1 year(s)' };
const MAX_PAGES = Number(process.env.MAX_PAGES ?? 150);
const MAX_DETAILS = Number(process.env.MAX_DETAILS ?? 1000);
const DETAIL_DELAY_MS = Number(process.env.DETAIL_DELAY_MS ?? 1500);
const CONTACT = process.env.SCRAPER_CONTACT ?? 'permit-watch';
const SAVE_EVERY = 20;
// After this many failed attempts a permit's detail page is left alone (some record types never
// load on the city's portal). A status change tries it again.
const MAX_DETAIL_FAILURES = 3;
// REFRESH_DETAILS=1 re-reads every listed permit's detail page (e.g. after the scraper learns new fields).
const REFRESH_DETAILS = process.env.REFRESH_DETAILS === '1';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

function pickStore(): Store {
  if (process.argv.includes('--dry-run')) return new JsonStore('scraper/output/dry-run.json');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!process.argv.includes('--json') && url && key) return new SupabaseStore(url, key);
  return new JsonStore();
}

// ------------------------------------------------------------------ portal

async function runSearch(page: Page) {
  await page.goto(`${BASE}/Permits/Search.aspx?microapp=c`, { waitUntil: 'networkidle' });

  // Selects are identified by an option they contain, not by ASP.NET's generated ids.
  async function choose(optionText: string, wanted: string) {
    const select = page.locator('select', { has: page.locator('option', { hasText: optionText }) }).first();
    await select.selectOption({ label: wanted });
  }
  await choose('All Permits', 'All Permits');
  await choose('Closed', 'All');
  await choose('Last 30 day(s)', WINDOW_LABEL[WINDOW] ?? WINDOW_LABEL.D30);

  await Promise.all([
    page.waitForURL(/SearchResults\.aspx/i, { timeout: 60_000 }),
    page.getByRole('button', { name: 'Search', exact: true }).click(),
  ]);
  await page.waitForLoadState('networkidle');
}

async function readGrid(page: Page): Promise<ListRow[]> {
  const raw = await page.$$eval('table.GeneralGrid tr', (trs) =>
    trs.map((tr) => ({
      cells: Array.from(tr.querySelectorAll('td')).map((td) => (td as HTMLElement).innerText),
      href: tr.querySelector('a[href*="Inquiry.aspx"]')?.getAttribute('href') ?? null,
    })),
  );
  return raw.map((r) => parseListRow(r.cells, r.href)).filter((r): r is ListRow => r !== null);
}

async function collectList(page: Page): Promise<ListRow[]> {
  const all = new Map<string, ListRow>();
  for (let n = 1; n <= MAX_PAGES; n++) {
    const rows = await readGrid(page);
    const before = all.size;
    for (const r of rows) all.set(r.app_id, r);
    log(`page ${n}: ${rows.length} rows (${all.size} total)`);
    if (all.size === before && n > 1) break; // pager looped back

    const next = page.getByRole('link', { name: 'Next Page' });
    if ((await next.count()) === 0) break;
    const firstId = rows[0]?.app_id;
    await next.first().click();
    await page.waitForLoadState('networkidle');
    // wait until the grid actually changed
    await page
      .waitForFunction(
        (id) => !document.querySelector('table.GeneralGrid tr:nth-child(2) td')?.textContent?.includes(id ?? ''),
        firstId,
        { timeout: 20_000 },
      )
      .catch(() => {});
    await sleep(400);
  }
  return [...all.values()];
}

async function readDetail(page: Page, guid: string): Promise<{ detail: PermitDetail; url: string }> {
  const url = `${BASE}/Permits/Inquiry.aspx?source=1&id=${guid}&microapp=c`;
  await page.goto(url, { waitUntil: 'networkidle' });
  // The labels are on the page right away; a background call fills in the values a moment later.
  // Poll until the record's values are there. A page that never fills in is skipped (not saved
  // blank) and retried on the next run.
  const deadline = Date.now() + 25_000;
  let text = '';
  for (;;) {
    text = await page.evaluate(() => document.body.innerText);
    if (isInquiryLoaded(text)) break;
    if (Date.now() > deadline) throw new Error('detail page never finished loading');
    await sleep(500);
  }
  await page.waitForLoadState('networkidle').catch(() => {});
  text = await page.evaluate(() => document.body.innerText);
  return { detail: parseInquiry(text), url };
}

function buildRecord(row: ListRow, detail: PermitDetail | null, detailUrl: string | null) {
  const work_type = detail?.work_type ?? null;
  const description = detail?.description ?? null;
  const { tags, reasons } = tagPermit({ app_type: row.app_type, subtype: row.subtype, work_type, description });
  const now = new Date().toISOString();
  return {
    app_id: row.app_id,
    source_guid: row.source_guid,
    app_type: row.app_type,
    subtype: row.subtype,
    status: row.status,
    applied_date: row.applied_date ?? detail?.applied_date ?? null,
    address: detail?.address ?? row.address,
    last_seen_at: now,
    tags,
    tag_reasons: reasons,
    ...(detail
      ? {
          permit_number: detail.permit_number,
          issued_date: detail.issued_date,
          city: detail.city,
          zip: detail.zip,
          owner_name: detail.owner_name,
          owner_address: detail.owner_address,
          work_type,
          description,
          valuation: detail.valuation,
          contractor_company: detail.contractor_company,
          contractor_name: detail.contractor_name,
          contractor_phone: detail.contractor_phone,
          contractor_license: detail.contractor_license,
          contractor_address: detail.contractor_address,
          contractor_mailing_address: detail.contractor_mailing_address,
          contractor_fax: detail.contractor_fax,
          contractor_city_registration: detail.contractor_city_registration,
          parcel_address: detail.parcel_address,
          legal_description: detail.legal_description,
          review_status: detail.review_status,
          plans_review_status: detail.plans_review_status,
          fields: detail.fields,
          detail_url: detailUrl,
          detail_scraped_at: now,
        }
      : {}),
  };
}

// --------------------------------------------------------------------- main

async function main() {
  const store = pickStore();
  await store.start();
  log(`saving to ${store.name}`);

  const browser = await chromium.launch({ headless: !process.env.HEADFUL });
  const context = await browser.newContext({ userAgent: `Mozilla/5.0 (compatible; PermitWatchSarasota/0.1; ${CONTACT})` });
  const page = await context.newPage();
  const stats: RunStats = { listed: 0, inserted: 0, updated: 0 };
  const count = (r: 'inserted' | 'updated') => stats[r]++;

  try {
    log(`searching portal (window ${WINDOW})`);
    await runSearch(page);
    const rows = await collectList(page);
    stats.listed = rows.length;
    log(`${rows.length} applications listed`);

    const existing = await store.existing(rows.map((r) => r.app_id));
    const needsDetail = rows.filter((r) => {
      const e = existing.get(r.app_id);
      if (!r.source_guid) return false;
      if (REFRESH_DETAILS || !e || e.status !== r.status) return true;
      return !e.complete && e.failures < MAX_DETAIL_FAILURES;
    });
    const givenUp = rows.filter((r) => {
      const e = existing.get(r.app_id);
      return e && !e.complete && e.failures >= MAX_DETAIL_FAILURES && e.status === r.status;
    }).length;
    if (givenUp) log(`${givenUp} permits skipped: their detail pages failed ${MAX_DETAIL_FAILURES}+ times on the city portal`);
    const todo = needsDetail.slice(0, MAX_DETAILS);
    log(`${existing.size} already stored · ${needsDetail.length} new or changed · opening ${todo.length} detail pages`);

    // 1. Already-stored permits that didn't change: just refresh status / last seen.
    const detailIds = new Set(todo.map((r) => r.app_id));
    for (const row of rows) {
      if (existing.has(row.app_id) && !detailIds.has(row.app_id)) count(await store.put(buildRecord(row, null, null), false));
    }
    await store.flush();

    // 2. New or changed permits: read the full record. Progress is saved as we go.
    let done = 0;
    let failed = 0;
    for (const [i, row] of todo.entries()) {
      try {
        const { detail, url } = await readDetail(page, row.source_guid!);
        count(await store.put({ ...buildRecord(row, detail, url), detail_failures: 0 }, true));
        log(`  ${++done}/${todo.length} ${row.app_id} ${row.subtype} · ${detail.zip ?? '?'} · ${detail.valuation ?? '-'}`);
      } catch (err) {
        // Still save the list-level record so the permit shows on the site, and count the failure.
        const prev = existing.get(row.app_id);
        const failures = (prev && prev.status === row.status ? prev.failures : 0) + 1;
        count(await store.put({ ...buildRecord(row, null, null), detail_failures: failures }, false));
        failed++;
        log(`  ${row.app_id} detail failed (${failures}/${MAX_DETAIL_FAILURES}): ${(err as Error).message}`);
      }
      if ((i + 1) % SAVE_EVERY === 0) await store.flush();
      await sleep(DETAIL_DELAY_MS);
    }
    if (failed) log(`${failed} detail pages failed this run`);
    if (needsDetail.length > todo.length) log(`${needsDetail.length - todo.length} left for the next run (MAX_DETAILS=${MAX_DETAILS})`);

    await store.finish(stats);
    log(`done: ${stats.inserted} new, ${stats.updated} updated`);
  } catch (err) {
    console.error(err);
    await store.finish(stats, String(err)).catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
