import assert from 'node:assert/strict';
import test from 'node:test';

import { mockupsAlreadyCover } from './mockup-reuse';

test('nothing rendered yet means the step has to run', () => {
  assert.equal(mockupsAlreadyCover([], null), false);
  assert.equal(mockupsAlreadyCover([], ['tpl-a']), false);
});

test('a run that named no templates is happy with whatever exists', () => {
  // It did not ask for anything in particular, so anything counts.
  assert.equal(mockupsAlreadyCover([{ templateId: 'tpl-a' }], null), true);
  assert.equal(mockupsAlreadyCover([{ templateId: 'tpl-a' }], []), true);
});

test('every named template has to be there already', () => {
  const existing = [{ templateId: 'tpl-a' }, { templateId: 'tpl-b' }];
  assert.equal(mockupsAlreadyCover(existing, ['tpl-a']), true);
  assert.equal(mockupsAlreadyCover(existing, ['tpl-a', 'tpl-b']), true);
});

test('a newly picked template still renders', () => {
  // The failure worth guarding: reuse too eagerly and a template the user has
  // just chosen silently never gets made.
  const existing = [{ templateId: 'tpl-a' }, { templateId: 'tpl-b' }];
  assert.equal(mockupsAlreadyCover(existing, ['tpl-a', 'tpl-c']), false);
  assert.equal(mockupsAlreadyCover(existing, ['tpl-c']), false);
});

test('extra mockups beyond what was asked for do not prevent reuse', () => {
  const existing = [{ templateId: 'tpl-a' }, { templateId: 'tpl-b' }, { templateId: 'tpl-z' }];
  assert.equal(mockupsAlreadyCover(existing, ['tpl-a']), true);
});
