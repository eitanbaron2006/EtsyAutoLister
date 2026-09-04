import assert from 'node:assert/strict';
import test from 'node:test';

import { readStudioPrefs } from './studio-prefs';

test('a listing that has never been through the studio reads as empty', () => {
  // The column is `jsonb not null default '{}'`, so this is what every new
  // product carries. Reaching for .templateIds.length on it is what crashed
  // the camera button.
  assert.deepEqual(readStudioPrefs({}), { templateIds: [], assignments: {}, printSetId: null });
  assert.deepEqual(readStudioPrefs(null), { templateIds: [], assignments: {}, printSetId: null });
  assert.deepEqual(readStudioPrefs(undefined), { templateIds: [], assignments: {}, printSetId: null });
});

test('a real selection comes back as it went in', () => {
  assert.deepEqual(
    readStudioPrefs({ templateIds: ['tpl-a', 'tpl-b'], assignments: { 0: 'front.jpg', 1: 'back.jpg' } }),
    { templateIds: ['tpl-a', 'tpl-b'], assignments: { 0: 'front.jpg', 1: 'back.jpg' }, printSetId: null },
  );
});

test('half a record is read as far as it makes sense', () => {
  assert.deepEqual(readStudioPrefs({ templateIds: ['tpl-a'] }), { templateIds: ['tpl-a'], assignments: {}, printSetId: null });
  assert.deepEqual(readStudioPrefs({ assignments: { 0: 'a.jpg' } }), { templateIds: [], assignments: { 0: 'a.jpg' }, printSetId: null });
});

test('nonsense in the column does not reach the screen', () => {
  // jsonb takes anything: an older version, a hand edit, a bad write.
  assert.deepEqual(readStudioPrefs({ templateIds: 'tpl-a' }), { templateIds: [], assignments: {}, printSetId: null });
  assert.deepEqual(readStudioPrefs({ templateIds: [1, null, 'tpl-b', ''] }), { templateIds: ['tpl-b'], assignments: {}, printSetId: null });
  assert.deepEqual(readStudioPrefs({ assignments: { front: 'a.jpg', 2: 7 } }), { templateIds: [], assignments: {}, printSetId: null });
  assert.deepEqual(readStudioPrefs([1, 2, 3]), { templateIds: [], assignments: {}, printSetId: null });
  assert.deepEqual(readStudioPrefs('templates'), { templateIds: [], assignments: {}, printSetId: null });
});

test('the print package a listing was set to survives, and only as a number', () => {
  // Chosen before a run; without one the render server falls back to the
  // package the shop configured for the shape the artwork arrives at.
  assert.equal(readStudioPrefs({ printSetId: 4 }).printSetId, 4);
  assert.equal(readStudioPrefs({ printSetId: '4' }).printSetId, null);
  assert.equal(readStudioPrefs({ printSetId: 2.5 }).printSetId, null);
  assert.equal(readStudioPrefs({}).printSetId, null);
});
