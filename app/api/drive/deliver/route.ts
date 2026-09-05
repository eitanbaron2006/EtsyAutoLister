// Deliver one listing's print files through the shop's Drive.
//
// Everything Etsy will not carry goes into a folder of the shop's own, the
// folder is shared by link, and the link is wrapped in a one-page PDF designed
// from the shop's name and colour. That PDF is what the listing carries, and
// it is the only file small enough for Etsy to take.
//
// The files are streamed render server -> here -> Drive. They never touch the
// browser: fifteen print sizes are well over a hundred megabytes, and pulling
// them down only to push them back up would spend that twice.

import { NextResponse } from 'next/server';

import { currentUserId } from '@/lib/drive-token';
import { ensureListingFolder, uploadToFolder, DriveError } from '@/lib/drive-files';
import { buildDeliverySheet } from '@/lib/delivery-pdf';
import { getShopBranding, fetchLogo } from '@/lib/shop-branding';
import type { PdfPresetChoice } from '@/lib/pdf-presets';
import { createClient as createServiceClient } from '@supabase/supabase-js';

interface DeliverRequest {
  listingId: string;
  folderName: string;
  listingTitle?: string;
  /** `{ fileName, url }` on the render server, which serves the bytes. */
  files: { fileName: string; url: string }[];
  /** Where the render server lives, as the browser knows it. */
  renderBaseUrl: string;
}

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}

const contentTypeFor = (name: string) =>
  /\.png$/i.test(name) ? 'image/png'
    : /\.webp$/i.test(name) ? 'image/webp'
      : /\.zip$/i.test(name) ? 'application/zip'
        : /\.pdf$/i.test(name) ? 'application/pdf'
          : 'image/jpeg';

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  let body: DeliverRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  if (!body.listingId || !body.folderName || !Array.isArray(body.files) || body.files.length === 0) {
    return NextResponse.json({ error: 'Nothing to deliver.' }, { status: 400 });
  }

  try {
    const service = serviceClient();
    const { data: settings } = await service
      .from('profiles').select('drive_folder_path, pdf_preset').eq('id', userId).maybeSingle();

    // Read before the folder is made: with no path set, the shop's own name
    // is the root, so the buyer folders sit under <Shop>/<Product> rather
    // than under this app's name.
    const branding = await getShopBranding(userId);

    const folder = await ensureListingFolder(
      userId, body.folderName, settings?.drive_folder_path, branding.shopName,
    );

    // One at a time on purpose: these are twenty megabytes each, and a dozen
    // concurrent uploads is how a local render server and a home connection
    // both fall over.
    let delivered = 0;
    let bytes = 0;
    const failed: string[] = [];

    for (const file of body.files) {
      try {
        const source = await fetch(new URL(file.url, body.renderBaseUrl).toString());
        if (!source.ok) throw new Error(`render server ${source.status}`);
        const blob = await source.blob();
        const saved = await uploadToFolder(
          userId, folder.folderId, file.fileName, blob, contentTypeFor(file.fileName),
        );
        delivered++;
        bytes += saved.bytes || blob.size;
      } catch (err) {
        console.error(`Could not deliver ${file.fileName}`, err);
        failed.push(file.fileName);
      }
    }

    if (delivered === 0) {
      return NextResponse.json(
        { error: 'None of the files could be uploaded to Drive.', failed },
        { status: 502 },
      );
    }

    // The sheet is built last, so its file count is what actually arrived
    // rather than what was hoped for.
    const logo = await fetchLogo(branding.iconUrl);

    const sheet = await buildDeliverySheet({
      branding,
      // Whatever the shop set in the sheet designer. The rest of the
      // design is resolved from its Etsy profile when the page is drawn.
      choice: (settings?.pdf_preset ?? {}) as PdfPresetChoice,
      listingTitle: body.listingTitle || body.folderName,
      downloadUrl: folder.url,
      fileCount: delivered,
      logo,
    });

    // Kept beside the files as well: a buyer who opens the folder should find
    // the same sheet there, not just in the Etsy download.
    await uploadToFolder(
      userId, folder.folderId, 'Your download.pdf', sheet, 'application/pdf',
    ).catch(err => console.warn('Could not put the sheet in the folder', err));

    const delivery = {
      provider: 'drive' as const,
      folderId: folder.folderId,
      url: folder.url,
      fileCount: delivered,
      bytes,
      deliveredAt: new Date().toISOString(),
    };
    await service.from('listings').update({ delivery })
      .eq('user_id', userId).eq('id', body.listingId);

    return NextResponse.json({
      success: true,
      delivery,
      failed,
      // Base64 so the browser can attach it to the Etsy listing without a
      // second round trip for a file it already caused to be made.
      sheet: Buffer.from(sheet).toString('base64'),
    });
  } catch (err: unknown) {
    const message = err instanceof DriveError
      ? err.message
      : err instanceof Error ? err.message : 'Delivery failed.';
    console.error('Drive delivery failed', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
