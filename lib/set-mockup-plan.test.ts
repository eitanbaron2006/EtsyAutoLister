import assert from 'node:assert/strict';
import test from 'node:test';

import { coversEveryArtwork, planSetMockups } from './set-mockup-plan';

test('at least three photos show the complete set', () => {
  for (const count of [2, 3, 4, 5, 7]) {
    const plan = planSetMockups(count, { total: 8 });
    const full = plan.filter(item => item.full);
    assert.ok(full.length >= 3, `a set of ${count} got ${full.length} full-set photos`);
    assert.ok(full.every(item => item.artworks.length === count));
  }
});

test('every artwork appears somewhere outside the full-set photos', () => {
  // The failure this guards: a set of five whose fifth image is never shown on
  // its own or in a group is a listing selling something unseen.
  for (const count of [2, 3, 4, 5, 6, 7, 9]) {
    const plan = planSetMockups(count, { total: 8 });
    assert.ok(coversEveryArtwork(plan, count), `a set of ${count} left an artwork unshown`);
  }
});

test('the groups get smaller rather than jumping straight to singles', () => {
  // A set of five reads as fours and threes before it reads as ones.
  const plan = planSetMockups(5, { total: 9 });
  const partials = plan.filter(item => !item.full).map(item => item.artworks.length);

  assert.deepEqual(partials.slice(0, 3), [4, 3, 2]);
  assert.ok(partials.includes(1), 'no single-artwork photo was planned');
});

test('a set of two has only pairs and singles to offer', () => {
  const plan = planSetMockups(2, { total: 6 });
  const partials = plan.filter(item => !item.full);

  assert.ok(partials.every(item => item.artworks.length === 1));
  assert.ok(coversEveryArtwork(plan, 2));
});

test('a single artwork is not a set and every photo shows it', () => {
  const plan = planSetMockups(1, { total: 5 });
  assert.equal(plan.length, 5);
  assert.ok(plan.every(item => item.artworks.length === 1 && item.full));
});

test('a template that holds fewer frames than the set caps the group', () => {
  // Sending more artworks than a template has frames fails the render.
  const plan = planSetMockups(9, { total: 6, maxGroup: 4 });
  assert.ok(plan.every(item => item.artworks.length <= 4));
  // The full-set shots are capped too, and the rest still cover everything.
  assert.ok(plan.filter(item => item.full).length >= 3);
});

test('the least-shown artwork is the one picked next', () => {
  // Coverage by construction, not by chance: with four artworks and groups
  // stepping down, the fourth is never the one left out.
  const plan = planSetMockups(4, { total: 7 });
  const appearances = [0, 0, 0, 0];
  for (const item of plan) {
    if (item.full) continue;
    for (const index of item.artworks) appearances[index] += 1;
  }
  assert.ok(appearances.every(count => count > 0), `appearances: ${appearances}`);
  // ...and no artwork is shown far more than another.
  assert.ok(Math.max(...appearances) - Math.min(...appearances) <= 1);
});
