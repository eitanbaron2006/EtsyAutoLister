// Which print files become thumbnails in the draft's photo gallery.
//
// Two lists exist and they are not the same: the deliverables are what Etsy
// receives, the sizes are what the run made. For a listing that fits they are
// identical. For a set they are not — the deliverable is one archive — and
// reading the deliverables left the draft showing none of the fifteen prints,
// because an archive is filtered out for having no preview.

import assert from 'node:assert/strict';
import test from 'node:test';

import { isPrintPreviewable } from './mockupgen';

type Entry = { fileName: string; url: string; bytes: number };

/** What buildPreviewGallery selects, given both maps for one folder. */
function printPreviews(sizes: Entry[] | undefined, deliverables: Entry[] | undefined) {
  return (sizes || deliverables || [])
    .filter(file => isPrintPreviewable(file.fileName))
    .map((file, index) => ({ id: `print-${index}`, label: file.fileName, url: file.url }));
}

const ratios = ['2x3_ratio_24x36_inch.jpg', '4x5_ratio_24x30_inch.jpg', 'iso-a_ratio_A1_inch.jpg',
  '1x1_ratio_24x24_inch.jpg', '5x7_ratio_50x70cm_inch.jpg'];
const sizesFor = (batches: string[]): Entry[] =>
  batches.flatMap(b => ratios.map(name => ({ fileName: name, url: `/print-outputs/${b}_${name}`, bytes: 7e6 })));
const archive: Entry[] = [{ fileName: 'print-files_complete.zip', url: '/print-outputs/p_complete.zip', bytes: 129e6 }];

test('a set shows every size, not the archive it ships as', () => {
  // The bug: reading the deliverables gave zero thumbnails for a set of three.
  assert.equal(printPreviews(sizesFor(['b1', 'b2', 'b3']), archive).length, 15);
});

test('reading the deliverables alone would have shown none', () => {
  assert.equal(printPreviews(undefined, archive).length, 0);
});

test('a single artwork is unchanged — both lists are the same five files', () => {
  const five = sizesFor(['b1']);
  assert.equal(printPreviews(five, five).length, 5);
});

test('a listing compiled before the two lists were separated still shows its sizes', () => {
  // No sizes map yet, deliverables are the individual files: the fallback path.
  assert.equal(printPreviews(undefined, sizesFor(['b1'])).length, 5);
});

test('every preview gets a distinct id even though names repeat', () => {
  const previews = printPreviews(sizesFor(['b1', 'b2', 'b3']), archive);
  assert.equal(new Set(previews.map(p => p.id)).size, 15);
  assert.equal(new Set(previews.map(p => p.url)).size, 15, 'and a distinct image behind each');
});

test('a listing with nothing compiled contributes no thumbnails', () => {
  assert.equal(printPreviews(undefined, undefined).length, 0);
  assert.equal(printPreviews([], []).length, 0);
});

test('a guide PDF alongside the sizes is not treated as a photo', () => {
  const withGuide = [...sizesFor(['b1']), { fileName: 'printing-guide.pdf', url: '/print-outputs/g.pdf', bytes: 1e5 }];
  assert.equal(printPreviews(withGuide, archive).length, 5);
});
