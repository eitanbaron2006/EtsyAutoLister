import assert from 'node:assert/strict';
import test from 'node:test';

import { bucketFor, safeSegment, storagePathFor } from './asset-paths';

test('a stored object sits under the owner uid, because that is the access rule', () => {
  const path = storagePathFor('7f3a-uid', 'Sunset Beach', 'source', 'front view.jpg');

  assert.equal(path, '7f3a-uid/Sunset_Beach/source/front_view.jpg');
  // The storage policy reads the first segment and nothing else, so it has to
  // be the uid, untouched.
  assert.equal(path.split('/')[0], '7f3a-uid');
});

test('mockups and sources of one listing stay apart', () => {
  const folder = 'Autumn Set';
  assert.notEqual(
    storagePathFor('uid', folder, 'source', 'a.jpg'),
    storagePathFor('uid', folder, 'mockup', 'a.jpg'),
  );
});

test('a folder name cannot climb out of its own prefix', () => {
  // A listing folder is user-supplied text. Without this it could be written
  // as a path and land somewhere it has no business being.
  assert.equal(safeSegment('../../etc/passwd'), 'etc-passwd');
  assert.equal(safeSegment('..'), 'unnamed');
  assert.equal(safeSegment('/'), 'unnamed');
  assert.ok(!storagePathFor('uid', '../elsewhere', 'source', 'x.png').includes('..'));
});

test('names stay readable rather than being hashed away', () => {
  // Someone looking into the bucket should be able to tell what they are
  // looking at without joining a table to find out.
  // NFKD unpacks the symbol into letters rather than dropping it, which keeps
  // the name meaning what it meant.
  assert.equal(safeSegment('Beach Sunset №3.jpeg'), 'Beach_Sunset_No3.jpeg');
  assert.equal(safeSegment('Café Noir.png'), 'Cafe_Noir.png');
  assert.equal(safeSegment('already-fine.png'), 'already-fine.png');
});

test('an empty or unusable name still produces a valid path', () => {
  assert.equal(safeSegment(''), 'unnamed');
  assert.equal(safeSegment('   '), 'unnamed');
  assert.equal(safeSegment('***'), 'unnamed');
  assert.equal(storagePathFor('uid', '', 'source', '').split('/').length, 4);
});

test('a very long name is cut rather than refused', () => {
  const long = `${'a'.repeat(400)}.jpg`;
  const segment = safeSegment(long);
  assert.ok(segment.length <= 120, `segment was ${segment.length} characters`);
  assert.ok(segment.startsWith('aaa'));
});

test('a mockup and a source go to different buckets', () => {
  // Two buckets rather than one prefix: a mockup is derived and replaceable,
  // a source is the thing the user gave us and cannot be made again.
  assert.equal(bucketFor('source'), 'sources');
  assert.equal(bucketFor('delivery'), 'sources');
  assert.equal(bucketFor('mockup'), 'mockups');
});
