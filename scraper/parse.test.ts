import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { isInquiryLoaded, parseInquiry, parseListRow, toIsoDate } from './parse';

const read = (name: string) => readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), 'utf8');
const fixture = read('inquiry-2027-000757.txt');

test('tells a filled page from the empty template', () => {
  assert.equal(isInquiryLoaded(fixture), true);
  assert.equal(isInquiryLoaded(read('inquiry-2027-000874.txt')), true);
  assert.equal(isInquiryLoaded(read('inquiry-empty-template.txt')), false);
});

test('contractor with a fax number and a city line under it', () => {
  const d = parseInquiry(read('inquiry-2027-000874.txt'));
  assert.equal(d.zip, '34236');
  assert.equal(d.valuation, 10600);
  assert.match(d.description ?? '', /^A\/C CHANGEOUT/);
  assert.equal(d.contractor_company, 'QUALITY CONTROL AIR OF SARASOTA');
  assert.equal(d.contractor_fax, '941-377-2477');
  assert.equal(d.contractor_address, '6311 PORTER RD SUITE 8\nSARASOTA FL 34240');
  assert.equal(d.contractor_city_registration, 'CR-13635');
  assert.equal(d.owner_name, 'SAMPLE OWNER A, SAMPLE OWNER B');
});

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
  assert.equal(d.plans_review_status, 'Pending Plan Corrections');
  assert.equal(d.contractor_address, '2401 15TH ST\nSARASOTA FLORIDA 34237');
  assert.equal(d.contractor_fax, null);
  assert.equal(d.contractor_city_registration, '15942');
  assert.equal(d.legal_description, 'LOT 28 PURTZ UNIT 2');
  // every non-empty field is kept, grouped by section
  assert.equal(d.fields['Description of Work']['Occupancy Use'], 'R3 Primary Perm, Not R1, R2,R4 or I');
  assert.equal(d.fields['Legal Owner and Description (current)']['Owner Name(s)'], 'HYDE PARK GCCC LLC');
  assert.equal(d.fields['Zoning Information']['Zone'], '0100');
  assert.equal(d.fields['Architect Information'], undefined, 'empty sections dropped');
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
