import assert from 'node:assert/strict';
import test from 'node:test';

import { createUploadedPreviews } from './uploaded-previews';

test('shows the user uploaded images without invented mockup variants', () => {
  const previews = createUploadedPreviews(
    [{ name: 'front-view.jpg' }, { name: 'detail-shot.png' }],
    ['blob:front', 'blob:detail'],
  );

  assert.deepEqual(previews, [
    { id: 'upload-0', label: 'front-view.jpg', image: 'blob:front' },
    { id: 'upload-1', label: 'detail-shot.png', image: 'blob:detail' },
  ]);
});

test('does not create a preview item when an uploaded image has no URL', () => {
  assert.deepEqual(
    createUploadedPreviews([{ name: 'front-view.jpg' }, { name: 'broken.jpg' }], ['blob:front', '']),
    [{ id: 'upload-0', label: 'front-view.jpg', image: 'blob:front' }],
  );
});
