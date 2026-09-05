// A print size is identified by its url, never by its name.
//
// The ratio names come from the ratio alone — 2x3_ratio_24x36_inch.jpg — so a
// set of three artworks makes three files called exactly that. Keying a list
// on the name made React warn about duplicate keys, and findIndex on the name
// resolved every one of them to the first: clicking the eleventh card opened
// the first artwork's image. The url carries the render server's batch id and
// is unique per file.

import assert from 'node:assert/strict';
import test from 'node:test';

type Size = { fileName: string; url: string; bytes: number };

const ratios = ['2x3_ratio_24x36_inch.jpg', '4x5_ratio_24x30_inch.jpg', 'iso-a_ratio_A1_inch.jpg'];
const sizesFor = (batches: string[]): Size[] =>
  batches.flatMap(batch =>
    ratios.map(name => ({ fileName: name, url: `/print-outputs/${batch}_${name}`, bytes: 7_000_000 })),
  );

test('a set repeats every file name, once per artwork', () => {
  const sizes = sizesFor(['b1', 'b2', 'b3']);
  assert.equal(sizes.length, 9);
  assert.equal(new Set(sizes.map(s => s.fileName)).size, 3, 'names collide by design');
});

test('urls stay unique across the whole set', () => {
  const sizes = sizesFor(['b1', 'b2', 'b3']);
  assert.equal(new Set(sizes.map(s => s.url)).size, sizes.length);
});

test('keying on the url gives React one key per rendered card', () => {
  const sizes = sizesFor(['b1', 'b2', 'b3']);
  const keys = sizes.map(s => s.url);
  assert.equal(new Set(keys).size, keys.length, 'duplicate keys drop or duplicate children');
});

test('finding by url opens the card that was clicked', () => {
  const sizes = sizesFor(['b1', 'b2', 'b3']);
  // The last artwork's first ratio — index 6, and the one the old lookup got wrong.
  const clicked = sizes[6];
  assert.equal(sizes.findIndex(s => s.url === clicked.url), 6);
});

test('finding by name resolves to the wrong card, which is the bug', () => {
  const sizes = sizesFor(['b1', 'b2', 'b3']);
  const clicked = sizes[6];
  assert.equal(sizes.findIndex(s => s.fileName === clicked.fileName), 0, 'name lookup lands on the first artwork');
});

test('a single artwork is unaffected either way', () => {
  const sizes = sizesFor(['b1']);
  const clicked = sizes[2];
  assert.equal(sizes.findIndex(s => s.url === clicked.url), 2);
  assert.equal(sizes.findIndex(s => s.fileName === clicked.fileName), 2);
});
