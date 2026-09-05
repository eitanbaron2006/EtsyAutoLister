// The four ways a listing's files reach the buyer.
//
// Which one applies depends on what the shop has connected, and they are not
// variations on one flow: they differ in where the archive goes, who makes the
// PDF, and how much the shop has to finish by hand. Each is spelled out so a
// change to one cannot quietly alter another.

import assert from 'node:assert/strict';
import test from 'node:test';

import { planDelivery, needsDelivery, type DeliveryContext } from './delivery-plan';

const base: DeliveryContext = { hasShop: false, hasDrive: false, oversize: true };

test('shop + Drive: every size and the archive go up, the listing carries the PDF', () => {
  const p = planDelivery({ ...base, hasShop: true, hasDrive: true });
  assert.equal(p.kind, 'drive');
  // Both, not one or the other: a buyer wanting a single ratio should not have
  // to take the whole archive to get at it.
  assert.equal(p.uploadSizesToDrive, true);
  assert.equal(p.uploadZipToDrive, true);
  assert.equal(p.attachPdfToEtsy, true);
  assert.equal(p.offerZipDownload, false, 'nothing to download by hand');
  assert.equal(p.offerPdfDownload, false);
  assert.equal(p.linkSource, 'drive');
});

test('Drive but no shop: the files still go up, the PDF comes back to the shop', () => {
  const p = planDelivery({ ...base, hasShop: false, hasDrive: true });
  assert.equal(p.uploadSizesToDrive, true);
  assert.equal(p.uploadZipToDrive, true);
  assert.equal(p.attachPdfToEtsy, false, 'there is no shop to attach it to');
  assert.equal(p.offerPdfDownload, true);
  assert.equal(p.allowPdfEditing, true);
  assert.equal(p.linkSource, 'drive');
});

test('shop but no Drive: the archive is a download and the PDF is editable', () => {
  const p = planDelivery({ ...base, hasShop: true, hasDrive: false });
  assert.equal(p.offerZipDownload, true);
  assert.equal(p.uploadZipToDrive, false);
  assert.equal(p.uploadSizesToDrive, false, 'there is nowhere to put them');
  assert.equal(p.makePdf, true);
  assert.equal(p.allowPdfEditing, true);
  assert.equal(p.attachPdfToEtsy, false, 'the app never hosted the files, so it has no link to post');
});

test('neither: everything is the shop\'s to do, and the PDF has nowhere to point', () => {
  const p = planDelivery(base);
  assert.equal(p.kind, 'manual');
  assert.equal(p.offerZipDownload, true);
  assert.equal(p.offerPdfDownload, true);
  assert.equal(p.linkSource, 'none');
  assert.match(p.summary, /Add your download link/);
});

test('a pasted link gives the PDF somewhere to point without Drive', () => {
  const p = planDelivery({ ...base, manualLink: 'https://example.com/files' });
  assert.equal(p.linkSource, 'manual');
  assert.equal(p.uploadZipToDrive, false, 'the app cannot put anything at a link it was handed');
});

test('a link of spaces is not a link', () => {
  assert.equal(planDelivery({ ...base, manualLink: '   ' }).linkSource, 'none');
});

test('a listing that fits needs nothing done to it', () => {
  const ctx = { ...base, oversize: false, hasShop: true, hasDrive: true };
  assert.equal(needsDelivery(ctx), false);
  const p = planDelivery(ctx);
  assert.equal(p.kind, 'none');
  assert.equal(p.makePdf, false);
  assert.equal(p.uploadZipToDrive, false);
});

test('a shop that wants every listing in its Drive gets one that fits too', () => {
  const ctx = { ...base, oversize: false, hasShop: true, hasDrive: true, alwaysUseDrive: true };
  assert.equal(needsDelivery(ctx), true);
  const p = planDelivery(ctx);
  assert.equal(p.uploadSizesToDrive, true);
  assert.equal(p.uploadZipToDrive, true);
});

test('the sizes and the archive travel together, never one alone', () => {
  // Sizes without the archive means no single download; the archive without
  // the sizes means no way to take just one. Either alone is a regression.
  for (const hasShop of [true, false]) {
    const p = planDelivery({ hasShop, hasDrive: true, oversize: true });
    assert.equal(p.uploadSizesToDrive, p.uploadZipToDrive, `${hasShop} uploads one without the other`);
  }
});

test('that preference does nothing without Drive to put them in', () => {
  // It is a backup, not a requirement, so it must never block a listing that
  // was going to publish perfectly well on its own.
  const ctx = { ...base, oversize: false, hasShop: true, hasDrive: false, alwaysUseDrive: true };
  assert.equal(needsDelivery(ctx), false);
  assert.equal(planDelivery(ctx).kind, 'none');
});

test('an oversize listing is never treated as needing nothing', () => {
  for (const hasShop of [true, false]) {
    for (const hasDrive of [true, false]) {
      const p = planDelivery({ hasShop, hasDrive, oversize: true });
      assert.notEqual(p.kind, 'none', `${hasShop}/${hasDrive} fell through`);
      assert.equal(p.makePdf, true, 'the buyer always needs telling where the files are');
    }
  }
});

test('the archive is either uploaded or offered — never both, never neither', () => {
  for (const hasShop of [true, false]) {
    for (const hasDrive of [true, false]) {
      const p = planDelivery({ hasShop, hasDrive, oversize: true });
      assert.equal(
        Number(p.uploadZipToDrive) + Number(p.offerZipDownload), 1,
        `${hasShop}/${hasDrive} leaves the archive in limbo`,
      );
      // And the individual sizes only ever go where something can host them.
      assert.equal(p.uploadSizesToDrive, hasDrive, `${hasShop}/${hasDrive} misplaces the sizes`);
    }
  }
});

test('every case says what it is doing', () => {
  for (const hasShop of [true, false]) {
    for (const hasDrive of [true, false]) {
      assert.ok(planDelivery({ hasShop, hasDrive, oversize: true }).summary.length > 20);
    }
  }
});

test('a backup copy never puts a PDF on a listing that carries its own files', () => {
  // Etsy allows five files. A listing that fits is already using those slots,
  // so a sheet added "for completeness" is what pushes it over — and it would
  // point the buyer at a link to files they were handed with the listing.
  const p = planDelivery({ ...base, oversize: false, hasShop: true, hasDrive: true, alwaysUseDrive: true });
  assert.equal(p.uploadZipToDrive, true, 'the backup still happens');
  assert.equal(p.attachPdfToEtsy, false);
  assert.equal(p.offerPdfDownload, false, 'there is nothing for the shop to do by hand either');
  assert.match(p.summary, /go up with the listing/);
});

test('the sheet only ever reaches Etsy for a listing that cannot carry its files', () => {
  for (const alwaysUseDrive of [true, false]) {
    for (const oversize of [true, false]) {
      const p = planDelivery({ ...base, oversize, hasShop: true, hasDrive: true, alwaysUseDrive });
      assert.equal(p.attachPdfToEtsy, oversize, `oversize=${oversize} always=${alwaysUseDrive}`);
    }
  }
});
