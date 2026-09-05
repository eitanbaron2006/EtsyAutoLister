// Connecting Drive without leaving the page.
//
// The first attempt redirected the whole tab and reassembled the workspace on
// the way back — the app reloads into the projects hub with no session, no
// mode and no category, and every one of those has to be rebuilt before the
// draft dialog is even mounted. The shop watched its screen disappear and come
// back wrong.
//
// A popup avoids all of it: the page underneath is never unloaded, so there is
// no state to save and none to restore. It is also what the Etsy connect flow
// in this app already does.

import assert from 'node:assert/strict';
import test from 'node:test';

type Message = { type?: string; ok?: boolean; accountEmail?: string | null; error?: string };

/** What the page's message handler does with an incoming postMessage. */
function onMessage(
  event: { origin: string; data: Message | string | null },
  appOrigin: string,
) {
  if (event.origin !== appOrigin) return { ignored: 'foreign origin' };
  if (typeof event.data !== 'object' || !event.data) return { ignored: 'not an object' };
  if (event.data.type !== 'DRIVE_AUTH_RESULT') return { ignored: 'not ours' };
  return event.data.ok
    ? { connectedAs: event.data.accountEmail ?? null, toast: 'success' }
    : { connectedAs: undefined, toast: 'error', error: event.data.error };
}

const APP = 'http://localhost:3000';

test('a successful grant moves the connected state in place', () => {
  const r = onMessage(
    { origin: APP, data: { type: 'DRIVE_AUTH_RESULT', ok: true, accountEmail: 'shop@gmail.com' } },
    APP,
  );
  assert.deepEqual(r, { connectedAs: 'shop@gmail.com', toast: 'success' });
});

test('a refusal reports without connecting anything', () => {
  const r = onMessage(
    { origin: APP, data: { type: 'DRIVE_AUTH_RESULT', ok: false, error: 'Drive was not connected.' } },
    APP,
  );
  assert.equal(r.toast, 'error');
  assert.equal(r.connectedAs, undefined);
});

test('a message from another origin is ignored', () => {
  // Any page holding a handle on this window can post to it. Only our own
  // popups are served from our origin.
  const r = onMessage(
    { origin: 'https://evil.example', data: { type: 'DRIVE_AUTH_RESULT', ok: true, accountEmail: 'attacker@x' } },
    APP,
  );
  assert.deepEqual(r, { ignored: 'foreign origin' });
});

test('the Etsy popup message is left to its own handler', () => {
  const r = onMessage({ origin: APP, data: { type: 'OAUTH_AUTH_SUCCESS' } }, APP);
  assert.deepEqual(r, { ignored: 'not ours' });
});

test('junk on the channel is ignored rather than thrown on', () => {
  assert.deepEqual(onMessage({ origin: APP, data: null }, APP), { ignored: 'not an object' });
  assert.deepEqual(onMessage({ origin: APP, data: 'hello' }, APP), { ignored: 'not an object' });
});

test('a grant with no address still counts as connected', () => {
  // The userinfo call is best effort; failing it must not fail the connection.
  const r = onMessage({ origin: APP, data: { type: 'DRIVE_AUTH_RESULT', ok: true } }, APP);
  assert.deepEqual(r, { connectedAs: null, toast: 'success' });
});
