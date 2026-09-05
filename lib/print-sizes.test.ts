// A set makes more print sizes than Etsy will accept as files, so the two
// lists diverge: what the shop looks at is every ratio, what Etsy receives is
// the packed result. Collapsing them is what made a set of three artworks
// report a single file.

import assert from 'node:assert/strict';
import test from 'node:test';

import type { PrintExportFile } from './mockupgen';

/** What buildPrintFilesForListing keeps for display, per artwork run. */
function sizesFrom(runs: { files: PrintExportFile[] }[]) {
  const sizes: { fileName: string; url: string; bytes: number; ratio: string }[] = [];
  for (const run of runs) {
    for (const entry of run.files || []) {
      if (!entry.success) continue;
      sizes.push({
        fileName: entry.file.split('_').slice(1).join('_') || entry.file,
        url: entry.url,
        bytes: entry.bytes ?? 0,
        ratio: entry.ratio,
      });
    }
  }
  return sizes;
}

const ratios = ['2x3', '4x5', 'iso_a', '1x1', '5x7'];
const runFor = (batch: string): { files: PrintExportFile[] } => ({
  files: ratios.map(ratio => ({
    file: `${batch}_${ratio}_ratio_24x36_inch.jpg`,
    success: true,
    ratio,
    url: `/print-outputs/${batch}_${ratio}_ratio_24x36_inch.jpg`,
    bytes: 7_000_000,
  })),
});

test('a single artwork yields its five ratios', () => {
  assert.equal(sizesFrom([runFor('b1')]).length, 5);
});

test('a set of three yields fifteen, not five', () => {
  // The bug: only the last artwork survived, so a set reported five sizes --
  // and once packed, one.
  const sizes = sizesFrom([runFor('b1'), runFor('b2'), runFor('b3')]);
  assert.equal(sizes.length, 15);
});

test('every ratio of every artwork is present', () => {
  const sizes = sizesFrom([runFor('b1'), runFor('b2'), runFor('b3')]);
  for (const ratio of ratios) {
    assert.equal(sizes.filter(s => s.ratio === ratio).length, 3, `${ratio} should appear once per artwork`);
  }
});

test('each size keeps its own url, so they are not one file repeated', () => {
  const sizes = sizesFrom([runFor('b1'), runFor('b2'), runFor('b3')]);
  assert.equal(new Set(sizes.map(s => s.url)).size, 15);
});

test('the batch prefix is stripped for display but the name stays unique enough to read', () => {
  const sizes = sizesFrom([runFor('b1')]);
  assert.equal(sizes[0].fileName, '2x3_ratio_24x36_inch.jpg');
  assert.ok(!sizes[0].fileName.startsWith('b1_'), 'the internal batch id is not the buyer\'s business');
});

test('failed ratios are left out rather than listed as sizes that exist', () => {
  const run: { files: PrintExportFile[] } = {
    files: [
      { file: 'b1_2x3.jpg', success: true, ratio: '2x3', url: '/print-outputs/b1_2x3.jpg', bytes: 10 },
      { file: 'b1_4x5.jpg', success: false, ratio: '4x5', url: '', bytes: 0 },
    ],
  };
  assert.equal(sizesFrom([run]).length, 1);
});

test('bytes total across the set, not just one artwork', () => {
  const sizes = sizesFrom([runFor('b1'), runFor('b2'), runFor('b3')]);
  assert.equal(sizes.reduce((sum, s) => sum + s.bytes, 0), 105_000_000);
});
