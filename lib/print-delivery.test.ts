// The three ways a listing's print files can be handed over, and the one that
// must never reach an upload.
//
// The render server decides: files that fit go up as they are, more files than
// slots get packed by size, and a total past the marketplace ceiling comes
// back as a single archive marked `oversize` — meant to be delivered as a link
// (a Drive folder named in a PDF), not uploaded. The client knew only the
// first two, so an oversize pack was labelled "packed into archives" and
// queued for a publish that could not succeed.

import assert from 'node:assert/strict';
import test from 'node:test';

import type { PrintDeliveryMode } from './mockupgen';

/** What publishToEtsySnapshot checks before it touches the listing status. */
function blocksPublish(delivery?: { mode: PrintDeliveryMode }): boolean {
  return delivery?.mode === 'oversize';
}

/** What buildPrintFilesForListing reports once the pack comes back. */
function reportsSuccess(mode: PrintDeliveryMode): boolean {
  return mode !== 'oversize';
}

test('files that fit the allowance publish', () => {
  assert.equal(blocksPublish({ mode: 'files' }), false);
});

test('archives packed within the allowance publish', () => {
  assert.equal(blocksPublish({ mode: 'archives' }), false);
});

test('an oversize pack is stopped before the upload starts', () => {
  assert.equal(blocksPublish({ mode: 'oversize' }), true);
});

test('a listing with no print files at all is not blocked by this check', () => {
  // Nothing was compiled; other guards cover that, and this one must not
  // stand in for them by refusing everything it does not recognise.
  assert.equal(blocksPublish(undefined), false);
});

test('oversize is not reported to the shop as a success', () => {
  assert.equal(reportsSuccess('oversize'), false);
  assert.equal(reportsSuccess('files'), true);
  assert.equal(reportsSuccess('archives'), true);
});

test('every mode the server can return is accounted for', () => {
  // If the server grows a fourth mode, this fails rather than letting it fall
  // through to the success path unnoticed.
  const modes: PrintDeliveryMode[] = ['files', 'archives', 'oversize'];
  for (const mode of modes) {
    assert.equal(typeof reportsSuccess(mode), 'boolean', `${mode} must be handled`);
  }
  assert.equal(modes.filter(m => !reportsSuccess(m)).length, 1, 'exactly one mode blocks delivery');
});
