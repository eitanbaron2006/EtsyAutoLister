// Pressing publish on a listing whose files Etsy will not carry.
//
// Three things decide what happens: whether the listing is oversize, whether
// the shop has a download location, and whether it has already answered the
// question. Getting the third wrong is what made the dialog's own Publish
// button do nothing useful — it always asked for a fileless publish, even
// after Drive had just been connected in front of it.

import assert from 'node:assert/strict';
import test from 'node:test';

type Options = { withoutFiles?: boolean; answered?: boolean };

/** What publishToEtsySnapshot does before it touches the listing. */
function publishAction(
  oversize: boolean,
  hasDeliveryRoute: boolean,
  options?: Options,
) {
  if (oversize && !hasDeliveryRoute && !options?.answered) return { action: 'ask' };
  return { action: 'publish', attachesFiles: !options?.withoutFiles };
}

/** What the dialog's confirm button sends, given the connected state. */
const dialogAnswer = (ready: boolean): Options => ({ withoutFiles: !ready, answered: true });

test('a listing that fits publishes with its files, no question asked', () => {
  assert.deepEqual(publishAction(false, false), { action: 'publish', attachesFiles: true });
});

test('an oversize listing with no route raises the question', () => {
  assert.deepEqual(publishAction(true, false), { action: 'ask' });
});

test('an oversize listing with a route publishes whole', () => {
  assert.deepEqual(publishAction(true, true), { action: 'publish', attachesFiles: true });
});

test('answering "publish without files" goes through instead of asking again', () => {
  // The loop this prevents: the answer arrives, the guard sees no route, and
  // raises the same dialog the answer came from.
  const answer = dialogAnswer(false);
  assert.deepEqual(publishAction(true, false, answer), { action: 'publish', attachesFiles: false });
});

test('connecting in the dialog, then pressing Publish, publishes whole', () => {
  // The bug: the button always sent withoutFiles, so a shop that had just
  // connected still published short.
  const answer = dialogAnswer(true);
  assert.equal(answer.withoutFiles, false);
  assert.deepEqual(publishAction(true, true, answer), { action: 'publish', attachesFiles: true });
});

test('the dialog answer always marks itself answered', () => {
  // Otherwise the fileless branch is unreachable — it asks forever.
  assert.equal(dialogAnswer(true).answered, true);
  assert.equal(dialogAnswer(false).answered, true);
});

test('answering does not turn an ordinary listing into a fileless one', () => {
  const answer = dialogAnswer(true);
  assert.deepEqual(publishAction(false, true, answer), { action: 'publish', attachesFiles: true });
});
