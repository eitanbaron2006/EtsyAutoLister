// Reading back the print sizes a listing already made.
//
// The export runs once per artwork, so a set leaves one record per image under
// the same reference. The restore used to read runs[0] and show that single
// artwork's ratios as the whole listing — five files for a set of three that
// had made fifteen, on every reload, without a re-compile fixing it.

import assert from 'node:assert/strict';
import test from 'node:test';

type Run = {
  id: number;
  artwork_name: string;
  created_at: string;
  files: { ratio_key: string; file_name: string; bytes: number }[];
};

/** The grouping the restore effect applies to one listing's export runs. */
function filesFromRuns(runs: Run[]) {
  const newestPerArtwork = new Map<string, Run>();
  for (const run of runs) {
    const key = run.artwork_name || String(run.id);
    const seen = newestPerArtwork.get(key);
    if (!seen || run.created_at > seen.created_at) newestPerArtwork.set(key, run);
  }
  return [...newestPerArtwork.values()].flatMap(run => run.files ?? []);
}

const ratios = ['2x3', '4x5', 'iso_a', '1x1', '5x7'];
const run = (id: number, artwork: string, at: string, batch = `b${id}`): Run => ({
  id,
  artwork_name: artwork,
  created_at: at,
  files: ratios.map(ratio => ({
    ratio_key: ratio,
    file_name: `${batch}_${ratio}_ratio_24x36_inch.jpg`,
    bytes: 7_000_000,
  })),
});

test('a single artwork restores its five ratios', () => {
  assert.equal(filesFromRuns([run(1, 'beach.png', '2026-09-05T10:00:00Z')]).length, 5);
});

test('a set of three restores fifteen, not the newest five', () => {
  const runs = [
    run(3, 'pampas.png', '2026-09-05T10:00:20Z'),
    run(2, 'sunset.png', '2026-09-05T10:00:10Z'),
    run(1, 'village.png', '2026-09-05T10:00:00Z'),
  ];
  assert.equal(filesFromRuns(runs).length, 15);
});

test('a re-compile replaces an artwork rather than stacking on it', () => {
  // Two passes over the same two artworks must give ten files, not twenty.
  const runs = [
    run(4, 'sunset.png', '2026-09-05T12:00:10Z', 'new2'),
    run(3, 'village.png', '2026-09-05T12:00:00Z', 'new1'),
    run(2, 'sunset.png', '2026-09-05T10:00:10Z', 'old2'),
    run(1, 'village.png', '2026-09-05T10:00:00Z', 'old1'),
  ];
  const files = filesFromRuns(runs);
  assert.equal(files.length, 10);
  assert.ok(files.every(f => f.file_name.startsWith('new')), 'the older pass must not survive');
});

test('runs arriving oldest-first still keep the newest of each artwork', () => {
  const runs = [
    run(1, 'village.png', '2026-09-05T10:00:00Z', 'old'),
    run(2, 'village.png', '2026-09-05T12:00:00Z', 'new'),
  ];
  const files = filesFromRuns(runs);
  assert.equal(files.length, 5);
  assert.ok(files.every(f => f.file_name.startsWith('new')));
});

test('records with no artwork name fall back to their id and are not merged', () => {
  const anonymous = [
    { ...run(1, '', '2026-09-05T10:00:00Z', 'a') },
    { ...run(2, '', '2026-09-05T10:00:10Z', 'b') },
  ];
  assert.equal(filesFromRuns(anonymous).length, 10, 'two distinct records must not collapse into one');
});

test('a listing with no runs restores nothing', () => {
  assert.equal(filesFromRuns([]).length, 0);
});
