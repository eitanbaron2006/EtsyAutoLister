// A set overflows Etsy's five-file allowance and comes back as one archive.
// Everywhere that draws a print file has to know an archive has no preview,
// or it renders a broken image — which is what the art-sizes column did.

import assert from 'node:assert/strict';
import test from 'node:test';

import { isPrintPreviewable } from './mockupgen';

test('the ratio exports a single artwork produces are previewable', () => {
  assert.equal(isPrintPreviewable('2x3_ratio_24x36_inch.jpg'), true);
  assert.equal(isPrintPreviewable('4x5_ratio_24x30_inch.jpeg'), true);
  assert.equal(isPrintPreviewable('iso_a_ratio_A1_inch.png'), true);
  assert.equal(isPrintPreviewable('1x1_ratio_24x24_inch.webp'), true);
});

test('the archive a set comes back as is not', () => {
  // The exact name the render server returned in the report that found this.
  assert.equal(isPrintPreviewable('print-files_complete.zip'), false);
});

test('other deliverables that reach this column are not previewable', () => {
  assert.equal(isPrintPreviewable('printing-guide.pdf'), false);
  assert.equal(isPrintPreviewable('sizes.svg'), false, 'the preview endpoint serves rasters only');
  assert.equal(isPrintPreviewable('bundle.tar.gz'), false);
});

test('the extension is matched at the end, not anywhere in the name', () => {
  // A folder or artwork named after an image format must not be mistaken for one.
  assert.equal(isPrintPreviewable('my.jpg.files.zip'), false);
  assert.equal(isPrintPreviewable('png_graphics_bundle.zip'), false);
});

test('case does not matter — the server has returned both', () => {
  assert.equal(isPrintPreviewable('2X3_RATIO.JPG'), true);
  assert.equal(isPrintPreviewable('COMPLETE.ZIP'), false);
});

test('a name with no extension is not assumed to be an image', () => {
  assert.equal(isPrintPreviewable('print-files_complete'), false);
  assert.equal(isPrintPreviewable(''), false);
});
