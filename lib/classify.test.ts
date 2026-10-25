import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categorize, stageOf } from './classify';
import { tagPermit } from './tags';

// Descriptions below are taken from real City of Sarasota permits.
const cp = (description: string, work_type = 'ALTERATIONS/REPAIRS - RESIDENTIAL') => ({
  app_type: 'Building and Zoning',
  subtype: 'Construction Permit',
  work_type,
  description,
});

test('real new pools are pools', () => {
  for (const d of [
    'Inground swimming pool with decking',
    'Installation of inground swimming pool',
    'Pool, spa & paver deck',
    '*** Private Provider Rev and Insp *** POOL SPA AND DECK',
    '*** Private Provider Rev and Insp*** Pool/Deck Addition',
    '*** Private Provider Insp *** New Construction Pool, Spa, and Pool Equipment. Pool equipment pad by home builder.',
  ]) {
    const c = categorize(cp(d, 'NEW - RESIDENTIAL'));
    assert.equal(c[0], 'pool', d);
    assert.ok(!c.includes('new'), `${d} is not a new home`);
    assert.ok(tagPermit(cp(d, 'NEW - RESIDENTIAL')).tags.includes('pool'), d);
    assert.equal(tagPermit(cp(d, 'NEW - RESIDENTIAL')).reasons.gutters, undefined, `${d}: a pool is not a new home`);
  }
});

test('jobs that only mention a pool are not pools', () => {
  const cases: [Parameters<typeof categorize>[0], string][] = [
    [{ app_type: 'Over the Counter Permit', subtype: 'Electrical', description: 'INSTALL 1 -240V 20AMP CIRCUIT IN EXISTING CONDUIT FROM POOL SUB PANEL TO POOL HEAT PUMP' }, 'electrical'],
    [{ app_type: 'Tree Permit', subtype: 'Tree Permit', description: 'REMOVE CABBAGE PALM ROOTS CRACKING THE POOL LINES' }, 'tree'],
    [cp('Installation of gas ( NATURAL ) piping and fittings from gas meter to (1) pool gas heater'), 'plumbing'],
    [cp('Installation of gas ( NATURAL ) piping and fittings to (1) pool gas heater'), 'plumbing'],
    [cp('Remove existing tile on pool equipment House for condo association and replace'), 'remodel'],
  ];
  for (const [p, expected] of cases) {
    const c = categorize(p);
    assert.ok(!c.includes('pool'), `${p.description} → ${c}`);
    assert.equal(c[0], expected, p.description!);
    assert.ok(!tagPermit(p).tags.includes('pool'), `tag: ${p.description}`);
  }
});

test('construction permits get categories from the description', () => {
  const expect: [string, string, string?][] = [
    ['replace wire fence for wood fence. 234.5\' of 6\' privacy wood fence', 'fence'],
    ['*** Private Provider Rev and Insp *** Building a fence for swim pool safety', 'fence'],
    ['Sage - 1216 1st St - 34236 Install New Halo Lit Channel Letters Direct Mounted to N. Front Wall Facade', 'signs'],
    ['Dock, Boat Lift, Upland Boardwalk', 'docks'],
    ['Stem Seawall.', 'docks'],
    ['Kitchen remodel, bathroom reface and tub to shower conversion', 'remodel'],
    ['INSTALLATION OF 1 GENERAC 28 KW AIR-COOLED STANDBY GENERATOR', 'solar'],
    ['Size for size replacement of windows with impact windows', 'windows'],
    ['New SFR total sq ft 2932.00', 'new', 'NEW - RESIDENTIAL'],
    ['Build new residential home', 'new', 'NEW - RESIDENTIAL'],
    ['*** Private Provider Rev and Insp*** NEW SINGLE FAMILY RESIDENCE', 'new', 'NEW - RESIDENTIAL'],
    ['Replace Grass and weeds with well draining artificial Turf', 'landscape'],
    ['Install (1) Aluminum Awning 11\'-5" X 5\'-0"', 'outdoor'],
    ['12x35x9 metal building with new concrete (peak height 12\')', 'outdoor'],
    ['REMOVE VINYL SIDING. INSTALL TYBEK HOUSE WRAP AND HARDIE BOARD SIDING 4X8', 'remodel'],
    ['HVAC CHANGE OUT - 3 Ton Heat Pump system', 'ac'],
  ];
  for (const [d, cat, wt] of expect) assert.equal(categorize(cp(d, wt))[0], cat, d);
});

test('a re-screen job counts as pool & screen', () => {
  const c = categorize(cp('Re-screen existing patio Re-place 2 French doors Bathrooms remodeling new tile and fixtures.'));
  assert.ok(c.includes('pool') && c.includes('windows') && c.includes('remodel'), String(c));
});

test('subtypes decide quick over-the-counter permits', () => {
  const otc = (subtype: string, description = '') => categorize({ app_type: 'Over the Counter Permit', subtype, description })[0];
  assert.equal(otc('AC Change-Out', 'A/C CHANGEOUT, RUUD, 2.5 TON'), 'ac');
  assert.equal(otc('Roofing', 'SCOPE: ROOF REPLACEMENT'), 'roofing');
  assert.equal(otc('Plumbing', 'WATER HEATER REPLACEMENT'), 'plumbing');
  assert.equal(otc('Doors'), 'windows');
  assert.equal(otc('Fire Alarm/Sprinkler Replacement'), 'electrical');
  assert.equal(categorize({ app_type: 'Engineering - Franchise Utilities' })[0], 'utilities');
  assert.equal(categorize({ app_type: 'Residential Exemption Application', subtype: 'Residential Exemption' })[0], 'other');
});

test('stages from real statuses', () => {
  const s: [string, string][] = [
    ['Pending Plan Review', 'filed'],
    ['Pending Pre-Pay', 'filed'],
    ['Pending Plan Review - Administrative', 'filed'],
    ['Pending Application Payment', 'filed'],
    ['Pending Plan Corrections', 'filed'],
    ['Plan Disapproved', 'filed'],
    ['Plan Approved', 'approved'],
    ['Pending Commencement Notice', 'approved'],
    ['Permit Issued', 'underway'],
    ['Pending Inspection', 'underway'],
    ['Pending Contractor Action', 'underway'],
    ['Pending Certificate Issue', 'underway'],
    ['Closed', 'finished'],
    ['Withdrawn', 'inactive'],
    ['Cancel Permit', 'inactive'],
  ];
  for (const [status, stage] of s) assert.equal(stageOf(status), stage, status);
});
