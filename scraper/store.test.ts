import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { JsonStore, readPermitsFile } from './store';

test('JSON store: first run inserts, later runs update and keep history', async () => {
  const path = join(mkdtempSync(join(tmpdir(), 'pw-')), 'permits.json');

  // Day 1: a new application with full detail.
  const day1 = new JsonStore(path);
  await day1.start();
  assert.equal((await day1.existing(['2027-000001'])).size, 0);
  assert.equal(
    await day1.put({ app_id: '2027-000001', status: 'Pending Plan Review', applied_date: '2026-10-20', tags: ['gutters'], tag_reasons: { gutters: 'Roof work' }, detail_scraped_at: 'x' }, true),
    'inserted',
  );
  await day1.finish({ listed: 1, inserted: 1, updated: 0 });

  const saved = readPermitsFile(path);
  assert.equal(saved.permits.length, 1);
  assert.equal(saved.lastRun?.inserted, 1);
  const firstSeen = saved.permits[0].first_seen_at;
  assert.ok(firstSeen);

  // Day 2: same permit seen again, list only, status changed. Plus one new permit.
  const day2 = new JsonStore(path);
  await day2.start();
  const existing = await day2.existing(['2027-000001', '2027-000002']);
  assert.equal(existing.get('2027-000001')?.status, 'Pending Plan Review');
  assert.equal(await day2.put({ app_id: '2027-000001', status: 'Issued', tags: [], tag_reasons: {} }, false), 'updated');
  assert.equal(await day2.put({ app_id: '2027-000002', status: 'Pending Plan Review', applied_date: '2026-10-22' }, true), 'inserted');
  await day2.finish({ listed: 2, inserted: 1, updated: 1 });

  const after = readPermitsFile(path);
  assert.equal(after.permits.length, 2);
  assert.equal(after.permits[0].app_id, '2027-000002', 'newest application first');
  const p1 = after.permits.find((p) => p.app_id === '2027-000001')!;
  assert.equal(p1.status, 'Issued');
  assert.ok(p1.status_changed_at, 'status change recorded');
  assert.deepEqual(p1.tags, ['gutters'], 'list-only refresh keeps tags');
  assert.equal(p1.first_seen_at, firstSeen, 'first_seen_at never moves');

  // One permit per line keeps git diffs small.
  assert.equal(readFileSync(path, 'utf8').split('\n').filter((l) => l.startsWith('{"')).length, 2);
});
