// When a listing needs somewhere for the buyer to download from, and whether
// this shop has one.
//
// Etsy takes five files of 20MB. Past that the render server hands back one
// archive marked `oversize`, which cannot be uploaded — so the listing is only
// sellable whole if the shop has a Drive account connected or a link of its
// own. Either is enough, and neither is checked anywhere else.

import assert from 'node:assert/strict';
import test from 'node:test';

import type { PrintDeliveryMode } from './mockupgen';

/** What the page computes from the profile. */
function hasDeliveryRoute(profile: { driveAccountEmail?: string | null; deliveryLink?: string | null }) {
  return !!profile.driveAccountEmail || !!(profile.deliveryLink && profile.deliveryLink.trim());
}

/** Whether opening the draft, or pressing publish, has to stop and ask. */
function needsPrompt(
  delivery: { mode: PrintDeliveryMode } | undefined,
  profile: { driveAccountEmail?: string | null; deliveryLink?: string | null },
) {
  return delivery?.mode === 'oversize' && !hasDeliveryRoute(profile);
}

const none = {};
const withDrive = { driveAccountEmail: 'shop@gmail.com' };
const withLink = { deliveryLink: 'https://drive.google.com/drive/folders/abc' };

test('a connected Drive account counts as a delivery route', () => {
  assert.equal(hasDeliveryRoute(withDrive), true);
});

test('a pasted link counts too', () => {
  assert.equal(hasDeliveryRoute(withLink), true);
});

test('whitespace is not a link', () => {
  assert.equal(hasDeliveryRoute({ deliveryLink: '   ' }), false);
  assert.equal(hasDeliveryRoute({ deliveryLink: '' }), false);
  assert.equal(hasDeliveryRoute({ deliveryLink: null }), false);
});

test('a listing that fits never prompts, however the shop is set up', () => {
  for (const profile of [none, withDrive, withLink]) {
    assert.equal(needsPrompt({ mode: 'files' }, profile), false);
    assert.equal(needsPrompt({ mode: 'archives' }, profile), false);
  }
});

test('an oversize listing with no route prompts', () => {
  assert.equal(needsPrompt({ mode: 'oversize' }, none), true);
});

test('an oversize listing stops prompting once either route exists', () => {
  assert.equal(needsPrompt({ mode: 'oversize' }, withDrive), false);
  assert.equal(needsPrompt({ mode: 'oversize' }, withLink), false);
});

test('a listing with no print files at all does not prompt', () => {
  // Nothing has been compiled; other guards cover that case, and this one must
  // not stand in for them by warning about a listing that has made no files.
  assert.equal(needsPrompt(undefined, none), false);
});

test('connecting Drive resolves a prompt that a link would also have resolved', () => {
  // Both routes are equal — the point of offering two.
  assert.equal(needsPrompt({ mode: 'oversize' }, { ...withDrive, ...withLink }), false);
});
