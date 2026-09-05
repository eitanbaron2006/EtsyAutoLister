// Folding a realtime change into the listing already held.
//
// Realtime does not carry every column. Measured against the running stack: an
// UPDATE on a listing arrives with 35 of its 36 columns, and the one left out
// is `description` — a couple of kilobytes of copy, dropped with no marker to
// say so. Replacing the held row with that payload erased the description on
// the next update of any kind, and the draft showed "No description provided"
// over copy that was in the database the whole time.

import assert from 'node:assert/strict';
import test from 'node:test';

type Row = Record<string, unknown>;
type Listing = Record<string, unknown>;

const COLUMN_TO_FIELD: Record<string, string> = {
  id: 'id',
  title: 'title',
  description: 'description',
  folder_name: 'folderName',
  status: 'status',
  mockup_note: 'mockupNote',
  price: 'price',
};

function rowToListing(row: Row): Listing {
  const out: Listing = {};
  for (const [column, value] of Object.entries(row)) {
    const field = COLUMN_TO_FIELD[column];
    if (!field || value === null || value === undefined) continue;
    out[field] = value;
  }
  return out;
}

function mergeListing(existing: Listing | undefined, row: Row): Listing {
  const incoming = rowToListing(row);
  if (!existing) return incoming;
  const merged = { ...existing, ...incoming };
  for (const [column, value] of Object.entries(row)) {
    const field = COLUMN_TO_FIELD[column];
    if (field && value === null) delete merged[field];
  }
  return merged;
}

const held: Listing = {
  id: 'l1', title: 'Coastal Set of 3', description: 'A long description…',
  folderName: 'coastal', status: 'ready',
};

test('a payload without the description keeps the one already held', () => {
  // The exact shape realtime sends: everything but description.
  const row: Row = { id: 'l1', title: 'Coastal Set of 3', folder_name: 'coastal', status: 'seo' };
  const merged = mergeListing(held, row);
  assert.equal(merged.description, 'A long description…');
  assert.equal(merged.status, 'seo', 'and still takes what the payload does carry');
});

test('replacing instead of merging is what lost it', () => {
  const row: Row = { id: 'l1', title: 'Coastal Set of 3', status: 'seo' };
  assert.equal(rowToListing(row).description, undefined);
});

test('a column present and null is a genuine clear, not an omission', () => {
  const row: Row = { id: 'l1', mockup_note: null };
  const withNote = { ...held, mockupNote: 'not enough templates' };
  assert.equal('mockupNote' in mergeListing(withNote, row), false);
});

test('an omitted column is not treated as a clear', () => {
  const row: Row = { id: 'l1', status: 'ready' };
  const withNote = { ...held, mockupNote: 'not enough templates' };
  assert.equal(mergeListing(withNote, row).mockupNote, 'not enough templates');
});

test('a first sighting needs no merge', () => {
  const row: Row = { id: 'l2', title: 'New', description: 'Fresh', folder_name: 'n', status: 'idle' };
  assert.deepEqual(mergeListing(undefined, row), {
    id: 'l2', title: 'New', description: 'Fresh', folderName: 'n', status: 'idle',
  });
});

test('an update that does change the description takes the new one', () => {
  const row: Row = { id: 'l1', description: 'Rewritten by the AI' };
  assert.equal(mergeListing(held, row).description, 'Rewritten by the AI');
});

test('unknown columns are ignored rather than leaking into the listing', () => {
  const row: Row = { id: 'l1', some_new_column: 'x' };
  assert.equal('some_new_column' in mergeListing(held, row), false);
});
