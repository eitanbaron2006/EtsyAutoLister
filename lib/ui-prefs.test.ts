import assert from 'node:assert/strict';
import test from 'node:test';

// The module pulls in the Supabase browser client, which refuses to load
// without these. The functions under test never reach it.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://127.0.0.1:57321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';

// Imported inside each test: a top-level await is not available in the
// CommonJS output the test runner produces.
const load = async () => (await import('./ui-prefs')).readStoredPrefs;

test('what the profile carries is taken at face value when it is valid', async () => {
  const readStoredPrefs = await load();
  assert.deepEqual(
    readStoredPrefs({ theme: 'dark', autopilot: false, fitMode: 'contain' }),
    { theme: 'dark', autopilot: false, fitMode: 'contain' },
  );
});

test('a preference that means nothing is ignored rather than adopted', async () => {
  const readStoredPrefs = await load();
  // The column is jsonb: an older version, a hand edit or a bad write can put
  // anything in there, and none of it should reach the screen.
  assert.deepEqual(readStoredPrefs({ theme: 'purple', autopilot: 'yes', fitMode: 'squash' }), {});
  assert.deepEqual(readStoredPrefs({ fitMode: 'cover', theme: 42 }), { fitMode: 'cover' });
});

test('an empty or missing object is simply no preferences', async () => {
  const readStoredPrefs = await load();
  assert.deepEqual(readStoredPrefs({}), {});
  assert.deepEqual(readStoredPrefs(null), {});
  assert.deepEqual(readStoredPrefs(undefined), {});
  assert.deepEqual(readStoredPrefs('dark'), {});
});

test('autopilot switched off survives, because false is a preference', async () => {
  const readStoredPrefs = await load();
  // The bug this guards: a falsy check would drop `autopilot: false` and turn
  // Guided mode back into Autopilot on every new browser.
  const prefs = readStoredPrefs({ autopilot: false });
  assert.equal(prefs.autopilot, false);
  assert.ok('autopilot' in prefs);
});
