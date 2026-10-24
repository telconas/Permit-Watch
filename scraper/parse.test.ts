import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseInquiry, parseListRow, toIsoDate } from './parse';

const fixture = readFileSync(fileURLToPath(new URL('./fixtures/inquiry-2027-000757.txt', import.meta.url)), 'utf8');

test('parses a real inquiry page', () => {
  const d = parseInquiry(fixture);
  assert.equal(d.app_id, '2027-000757');
  assert.equal(d.permit_number, null);
  assert.equal(d.applied_date, '2026-10-21');
  assert.equal(d.issued_date, null);
  assert.equal(d.address, '2128 HYDE PARK CIR');
  assert.equal(d.city, 'SARASOTA');
  assert.equal(d.zip, '34239');
  assert.equal(d.owner_name, 'HYDE PARK GCCC LLC');
  assert.equal(d.owner_address, 'PO BOX 17885\nSARASOTA FL 34276-0885');
  assert.equal(d.work_type, 'ALTERATIONS/REPAIRS - RESIDENTIAL');
  assert.match(d.description ?? '', /^CAST IRON REPLACEMENT/);
  assert.equal(d.valuation, 21000);
  assert.equal(d.contractor_company, "TERRY'S PLUMBING SERVICE INC");
  assert.equal(d.contractor_name, 'TERRY LEE ROBERTS');
  assert.equal(d.contractor_phone, '(941)955-5362');
  assert.equal(d.contractor_license, 'CFC046012');
  assert.equal(d.review_status, 'Pending Plan Review');
});

test('parses a results row and its record id', () => {
  const row = parseListRow(
    ['2027-000757', 'Over the Counter Permit', 'Plumbing', '10/21/2026', 'Pending Plan Review', '2128 HYDE PARK CIR'],
    'Inquiry.aspx?source=1&id=04becf2b-54cd-f111-9178-005056841f49&microapp=c',
  );
  assert.ok(row);
  assert.equal(row.source_guid, '04becf2b-54cd-f111-9178-005056841f49');
  assert.equal(row.applied_date, '2026-10-21');
});

test('skips header and pager rows', () => {
  assert.equal(parseListRow(['Application ID', 'Application Type'], null), null);
  assert.equal(parseListRow(['Return to change search criteria', '1 Next Page'], null), null);
});

test('dates', () => {
  assert.equal(toIsoDate('9/5/2026'), '2026-09-05');
  assert.equal(toIsoDate(''), null);
});
