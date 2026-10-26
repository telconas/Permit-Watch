import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tagPermit } from './tags';

test('new single-family home gets every trade', () => {
  const r = tagPermit({ work_type: 'NEW CONSTRUCTION - RESIDENTIAL', description: 'NEW SINGLE FAMILY RESIDENCE 2 STORY' });
  assert.deepEqual([...r.tags].sort(), ['blinds', 'fence', 'gutters', 'landscaping', 'painting', 'pool']);
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
  assert.deepEqual(r.tags, ['blinds', 'painting']);
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

test('painting: real Sarasota descriptions', () => {
  const yes: [string, string][] = [
    ['limited concrete repairs, limited stucco repairs, waterproofing, and guardrail replacement', 'Concrete or balcony restoration'],
    ['Interior renovations including, framing, wiring and drywall/painting. Also, new HVAC system', 'Remodel'],
    ['This is a response to a notice of violation for exterior wall and stucco work without a permit', 'Stucco, drywall or siding work'],
    ['REPLACE ROTTED SOFFIT AND FASCIA', 'Stucco, drywall or siding work'],
    ['REMOVE VINYL SIDING. INSTALL TYBEK HOUSE WRAP AND HARDIE BOARD SIDING 4X8', 'Stucco, drywall or siding work'],
    ['Exterior repaint of building, no color change', 'Painting in the scope'],
  ];
  for (const [description, reason] of yes) {
    const r = tagPermit({ description });
    assert.ok(r.tags.includes('painting'), description);
    assert.equal(r.reasons.painting, reason, description);
  }
  const no = [
    '3/4" polyethylene gas line direct bury from existing 1" 2psi gas line at exterior stucco wall to generator',
    'CHANGE OUT 3 TON AC SAME LOCATION',
    'Replace 23 existing carport lights with new fixtures',
    'REROOF SHINGLE TO METAL',
    'REPLACE SIDING WITH ALSIDE ASCEND-CHARTER OAK VINYL SIDING',
    'Replace 8 existing outlets with 8 new waterproof GFI outlets',
    'Artist is painting a mural funded by the City of Sarasota Public Art Program',
    'Installation of non-illuminated building sign: flat cut acrylic letters flush mounted to painted wall',
    "Installation of new 10'x16' DCA approved Cabana style Superior shed. Color to complement residence. LP smart siding",
  ];
  for (const description of no) assert.ok(!tagPermit({ description }).tags.includes('painting'), description);
});
