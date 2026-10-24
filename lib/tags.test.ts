import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tagPermit } from './tags';

test('new single-family home gets every trade', () => {
  const r = tagPermit({ work_type: 'NEW CONSTRUCTION - RESIDENTIAL', description: 'NEW SINGLE FAMILY RESIDENCE 2 STORY' });
  assert.deepEqual([...r.tags].sort(), ['blinds', 'fence', 'gutters', 'landscaping', 'pool']);
  assert.equal(r.reasons.gutters, 'New home');
});

test('re-roof suggests gutters only', () => {
  const r = tagPermit({ app_type: 'Over the Counter Permit', subtype: 'Roofing', description: 'REROOF SHINGLE TO METAL' });
  assert.deepEqual(r.tags, ['gutters']);
  assert.equal(r.reasons.gutters, 'Roof work');
});

test('pool permit suggests fence, landscaping and pool', () => {
  const r = tagPermit({ subtype: 'Pool', description: 'INGROUND POOL AND SPA' });
  assert.deepEqual([...r.tags].sort(), ['fence', 'landscaping', 'pool']);
});

test('window replacement suggests blinds', () => {
  const r = tagPermit({ subtype: 'Windows', description: 'REPLACE 12 WINDOWS SAME SIZE' });
  assert.deepEqual(r.tags, ['blinds']);
});

test('plumbing repair gets no tags', () => {
  const r = tagPermit({
    subtype: 'Plumbing',
    work_type: 'ALTERATIONS/REPAIRS - RESIDENTIAL',
    description: 'CAST IRON REPLACEMENT UNDER SLAB W/ SEWER RE-ROUTE + MINI LIFT STATION',
  });
  assert.deepEqual(r.tags, []);
});

test('"additional" does not count as an addition', () => {
  const r = tagPermit({ description: 'ADDITIONAL OUTLETS IN GARAGE' });
  assert.deepEqual(r.tags, []);
});

test('tree permit suggests landscaping', () => {
  const r = tagPermit({ app_type: 'Tree Permit', description: 'REMOVE 2 OAKS' });
  assert.deepEqual(r.tags, ['landscaping']);
});
