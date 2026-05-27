import assert from 'node:assert/strict';
import test from 'node:test';

import { buildListingContents } from './listing-contents';

test('marks the multimodal listing prompt with the user role required by Vertex', () => {
  const contents = buildListingContents('sample-product', [
    'data:image/png;base64,aW1hZ2U=',
  ]);

  assert.equal(contents.role, 'user');
  assert.equal(contents.parts.length, 2);
});
