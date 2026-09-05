// How one shop's delivery sheet is designed.
//
// The sheet is the product on an oversize listing and the last thing a buyer
// sees with the shop's name on it, so what it looks like has to come from the
// shop. Three sources, narrowest first: what the shop set by hand, then its
// Etsy profile, then the preset's own defaults.

import assert from 'node:assert/strict';
import test from 'node:test';

import { PDF_PRESETS, parseHexColor, presetById, resolvePdfDesign } from './pdf-presets';

const etsyShop = { shopName: 'Coastal Fine Art Prints', iconUrl: 'https://i.etsystatic.com/logo.png' };

test('every preset has a distinct id and a usable accent', () => {
  const ids = PDF_PRESETS.map(p => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const preset of PDF_PRESETS) {
    assert.ok(parseHexColor(preset.accent), `${preset.id} has an unusable accent`);
  }
});

test('an unknown preset falls back rather than crashing the delivery', () => {
  assert.equal(presetById('no-such-preset').id, 'studio');
  assert.equal(presetById(undefined).id, 'studio');
});

test("the shop's name reaches the sheet", () => {
  const d = resolvePdfDesign(undefined, etsyShop);
  assert.equal(d.shopName, 'Coastal Fine Art Prints');
  assert.match(d.message, /Coastal Fine Art Prints/, 'and is spoken to the buyer, not just printed');
});

test('a colour set by hand beats the one from Etsy, which beats the preset', () => {
  const preset = presetById('studio');
  const fromPreset = resolvePdfDesign(undefined, { shopName: 'S' });
  assert.deepEqual(fromPreset.accent, parseHexColor(preset.accent));

  const fromEtsy = resolvePdfDesign(undefined, { shopName: 'S', accentColor: '#123456' });
  assert.deepEqual(fromEtsy.accent, parseHexColor('#123456'));

  const byHand = resolvePdfDesign({ accentColor: '#abcdef' }, { shopName: 'S', accentColor: '#123456' });
  assert.deepEqual(byHand.accent, parseHexColor('#abcdef'));
});

test('a malformed colour falls through instead of drawing nothing', () => {
  // A shop typing "teal" must not produce a sheet with no colour in it.
  const d = resolvePdfDesign({ accentColor: 'teal' }, { shopName: 'S', accentColor: '#123456' });
  assert.deepEqual(d.accent, parseHexColor('#123456'));
});

test('short hex, and hex without the hash, are both accepted', () => {
  assert.deepEqual(parseHexColor('#fff'), parseHexColor('#ffffff'));
  assert.deepEqual(parseHexColor('2f6f6b'), parseHexColor('#2f6f6b'));
  assert.equal(parseHexColor('#12345'), null);
  assert.equal(parseHexColor(''), null);
});

test('the logo is only drawn when the preset wants one and the shop has one', () => {
  assert.equal(resolvePdfDesign(undefined, etsyShop).showLogo, true);
  assert.equal(resolvePdfDesign(undefined, { shopName: 'S' }).showLogo, false, 'no icon, no logo');
  assert.equal(resolvePdfDesign({ preset: 'minimal' }, etsyShop).showLogo, false, 'minimal has none');
  assert.equal(resolvePdfDesign({ showLogo: false }, etsyShop).showLogo, false, 'overridable');
});

test('a shop with nothing set still gets a sheet that reads sensibly', () => {
  const d = resolvePdfDesign(undefined, undefined);
  assert.equal(d.shopName, 'Your download');
  assert.ok(d.headline.length > 0);
  assert.ok(d.message.length > 0);
});

test('a headline of spaces is not a headline', () => {
  assert.equal(resolvePdfDesign({ headline: '   ' }, etsyShop).headline, 'Thank you for your order');
});
