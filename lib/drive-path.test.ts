// Where a shop's buyer folders live in its Drive.
//
// A path the app creates, not a folder the shop picks: the `drive.file` scope
// this app holds sees only what it made itself, so an existing folder chosen
// by hand would be invisible to it. Each segment becomes a real folder in
// someone's Drive, which is why the parsing is strict.

import assert from 'node:assert/strict';
import test from 'node:test';

import { parseFolderPath, DEFAULT_FOLDER_PATH } from './drive-path';

test("nothing set means the shop's own name", () => {
  // What a shop expects to find in its Drive is its shop, not this tool.
  assert.deepEqual(parseFolderPath(undefined, 'Coastal Fine Art Prints'), ['Coastal Fine Art Prints']);
  assert.deepEqual(parseFolderPath('', 'Coastal Fine Art Prints'), ['Coastal Fine Art Prints']);
  assert.deepEqual(parseFolderPath('   ', 'Coastal Fine Art Prints'), ['Coastal Fine Art Prints']);
});

test('the app name is the last resort, not the default', () => {
  // Only a shop with no path and no connected Etsy account ever sees it.
  assert.deepEqual(parseFolderPath(undefined, undefined), [DEFAULT_FOLDER_PATH]);
  assert.deepEqual(parseFolderPath(null, null), [DEFAULT_FOLDER_PATH]);
  assert.deepEqual(parseFolderPath('', '  '), [DEFAULT_FOLDER_PATH]);
});

test('a chosen path still beats the shop name', () => {
  assert.deepEqual(parseFolderPath('Etsy/Downloads', 'Coastal Fine Art Prints'), ['Etsy', 'Downloads']);
});

test('a shop name carrying a slash stays one folder', () => {
  // Otherwise "Ink & Paper / Studio" would silently become two.
  assert.deepEqual(parseFolderPath(undefined, 'Ink & Paper / Studio'), ['Ink & Paper   Studio']);
});

test('a shop name in another script is kept as it is', () => {
  assert.deepEqual(parseFolderPath(undefined, 'חנות האמנות'), ['חנות האמנות']);
});

test('a single name is a single folder', () => {
  assert.deepEqual(parseFolderPath('Downloads'), ['Downloads']);
});

test('slashes nest', () => {
  assert.deepEqual(parseFolderPath('Etsy/Downloads/2026'), ['Etsy', 'Downloads', '2026']);
});

test('stray slashes and spaces collapse', () => {
  assert.deepEqual(parseFolderPath('/Etsy//Downloads/'), ['Etsy', 'Downloads']);
  assert.deepEqual(parseFolderPath(' Etsy / Downloads '), ['Etsy', 'Downloads']);
});

test('leading dots are stripped — a hidden folder is one nobody finds again', () => {
  assert.deepEqual(parseFolderPath('.hidden/Downloads'), ['hidden', 'Downloads']);
  assert.deepEqual(parseFolderPath('...'), [DEFAULT_FOLDER_PATH], 'and dots alone are not a name');
});

test('a runaway path is capped rather than dug', () => {
  const deep = parseFolderPath('a/b/c/d/e/f/g/h/i/j');
  assert.equal(deep.length, 6);
});

test('an absurd segment is truncated, not refused', () => {
  const [segment] = parseFolderPath('x'.repeat(400));
  assert.equal(segment.length, 120);
});

test('unicode and spaces in names survive — shops name folders in their own language', () => {
  assert.deepEqual(parseFolderPath('חנות/הורדות'), ['חנות', 'הורדות']);
  assert.deepEqual(parseFolderPath('My Shop/Buyer Files'), ['My Shop', 'Buyer Files']);
});
