import assert from 'node:assert/strict';
import test from 'node:test';

import { createMockupGallery, getReviewMockups } from './mockup-gallery';

test('labels three generated review mockups in display order', () => {
  const gallery = createMockupGallery(['hero.jpg', 'detail.jpg', 'cover.jpg']);

  assert.deepEqual(gallery, [
    { id: 'hero', label: 'Hero', image: 'hero.jpg' },
    { id: 'detail', label: 'Detail', image: 'detail.jpg' },
    { id: 'store-cover', label: 'Store Cover', image: 'cover.jpg' },
  ]);
});

test('uses the legacy mockup image when a stored gallery is missing', () => {
  assert.deepEqual(getReviewMockups(undefined, 'saved-hero.jpg'), [
    { id: 'hero', label: 'Hero', image: 'saved-hero.jpg' },
  ]);
});

test('does not render blank generated image entries', () => {
  assert.deepEqual(createMockupGallery(['hero.jpg', '', 'cover.jpg']), [
    { id: 'hero', label: 'Hero', image: 'hero.jpg' },
    { id: 'store-cover', label: 'Store Cover', image: 'cover.jpg' },
  ]);
});
