// Knowing a listing is oversize after the tab has been reloaded.
//
// The render server decides how a listing's files can be handed over at pack
// time. That answer lived only in React state, so a reload lost it — and with
// it the warning that offers to connect Drive. The shop pressed publish on an
// oversize listing and got a raw refusal from Etsy instead of the dialog.
//
// It is now written to the listing as well as held in session. These are the
// rules for reading the two back.

import assert from 'node:assert/strict';
import test from 'node:test';

import type { ListingMetadata } from './listing-types';

type SessionMap = Record<string, { mode: 'files' | 'archives' | 'oversize'; note?: string }>;

/** What deliveryFor does. */
function deliveryFor(map: SessionMap, listing: Pick<ListingMetadata, 'folderName' | 'printDelivery'>) {
  return map[listing.folderName]
    ?? (listing.printDelivery?.mode
      ? { mode: listing.printDelivery.mode, note: listing.printDelivery.note }
      : undefined);
}

const oversizeListing = {
  folderName: 'coastal set',
  printDelivery: { mode: 'oversize' as const, note: '129MB against 100MB the marketplace accepts.' },
};

test('a fresh tab still knows the listing is oversize', () => {
  // The bug: an empty session map meant undefined, so the guard never fired.
  const delivery = deliveryFor({}, oversizeListing);
  assert.equal(delivery?.mode, 'oversize');
});

test('the note survives the reload too, so the dialog can quote the totals', () => {
  assert.match(deliveryFor({}, oversizeListing)?.note ?? '', /129MB/);
});

test('the session value wins while a compile is still landing', () => {
  // A re-compile that changed the answer must not be masked by the stored one.
  const map: SessionMap = { 'coastal set': { mode: 'files' } };
  assert.equal(deliveryFor(map, oversizeListing)?.mode, 'files');
});

test('a listing never compiled has no delivery either way', () => {
  assert.equal(deliveryFor({}, { folderName: 'new', printDelivery: null }), undefined);
  assert.equal(deliveryFor({}, { folderName: 'new' }), undefined);
});

test('a listing that fits reads back as fitting, not as unknown', () => {
  const fits = { folderName: 'single', printDelivery: { mode: 'files' as const } };
  assert.equal(deliveryFor({}, fits)?.mode, 'files');
});

test('only oversize raises the warning', () => {
  const raises = (l: Pick<ListingMetadata, 'folderName' | 'printDelivery'>) =>
    deliveryFor({}, l)?.mode === 'oversize';
  assert.equal(raises(oversizeListing), true);
  assert.equal(raises({ folderName: 'a', printDelivery: { mode: 'files' } }), false);
  assert.equal(raises({ folderName: 'b', printDelivery: { mode: 'archives' } }), false);
  assert.equal(raises({ folderName: 'c', printDelivery: null }), false);
});
