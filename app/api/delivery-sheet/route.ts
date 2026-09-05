// The buyer's download sheet, drawn on request.
//
// Two callers, one drawing. The editor posts settings the shop has not saved
// yet and shows what comes back; a listing with no Drive behind it posts its
// real title and link and hands the file to the shop to upload. Splitting
// those into two routes would be two copies of the same page, and the whole
// point of the editor is that the preview is the file.
//
// Anything the caller leaves out is filled with a stand-in, so an empty
// request still reads like a finished sheet rather than a form full of gaps.

import { NextResponse } from 'next/server';

import { currentUserId } from '@/lib/drive-token';
import { buildDeliverySheet } from '@/lib/delivery-pdf';
import { getShopBranding, fetchLogo } from '@/lib/shop-branding';
import type { PdfPresetChoice } from '@/lib/pdf-presets';

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  let body: {
    choice?: PdfPresetChoice;
    listingTitle?: string;
    downloadUrl?: string;
    fileCount?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  try {
    const branding = await getShopBranding(userId);
    const logo = await fetchLogo(branding.iconUrl);

    const sheet = await buildDeliverySheet({
      branding,
      choice: body.choice,
      listingTitle: body.listingTitle || 'Your listing title appears here',
      downloadUrl: body.downloadUrl || 'https://drive.google.com/drive/folders/your-folder',
      fileCount: body.fileCount ?? 15,
      logo,
    });

    return new NextResponse(Buffer.from(sheet), {
      headers: {
        'Content-Type': 'application/pdf',
        // Never worth keeping: in the editor the next keystroke replaces it,
        // and for a real listing the link it carries can change.
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Could not build the delivery sheet', err);
    return NextResponse.json({ error: 'Could not build the sheet.' }, { status: 500 });
  }
}
