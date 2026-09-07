import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const WIREMOCK_URL = process.env.ETSY_API_BASE_URL || 'http://127.0.0.1:8080';
const DB_FILE = path.join(process.cwd(), 'wiremock', 'mock-store-db.json');

function loadSavedListings(): any[] {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content) || [];
    }
  } catch (e) {
    console.error('Failed to read mock-store-db.json:', e);
  }
  return [];
}

function saveListings(listings: any[]) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(listings, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write mock-store-db.json:', e);
  }
}

export async function GET() {
  try {
    const savedListings = loadSavedListings();

    const res = await fetch(`${WIREMOCK_URL}/__admin/requests`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({
        connected: false,
        error: `WireMock returned status ${res.status}`,
        listings: savedListings,
        rawRequests: [],
      });
    }

    const data = await res.json();
    const allRequests: any[] = data.requests || [];

    // Separate requests
    const createListingReqs = allRequests.filter(
      (r) =>
        r.request.method === 'POST' &&
        r.request.url.includes('/listings') &&
        !r.request.url.includes('/images') &&
        !r.request.url.includes('/files')
    );

    const imageReqs = allRequests.filter(
      (r) => r.request.method === 'POST' && r.request.url.includes('/images')
    );

    const fileReqs = allRequests.filter(
      (r) => r.request.method === 'POST' && r.request.url.includes('/files')
    );

    let activeListings = savedListings;

    // If WireMock has recorded new listings, parse and persist them
    if (createListingReqs.length > 0) {
      const parsedListings = createListingReqs.map((req, index) => {
        const loggedDate = req.request.loggedDate || Date.now();
        const body = req.request.body || '';
        const params = new URLSearchParams(body);

        const nextListingDate =
          createListingReqs[index - 1]?.request?.loggedDate || Infinity;
        const associatedImages = imageReqs.filter(
          (img) =>
            img.request.loggedDate >= loggedDate - 2000 &&
            img.request.loggedDate <= nextListingDate + 2000
        );
        const associatedFiles = fileReqs.filter(
          (f) =>
            f.request.loggedDate >= loggedDate - 2000 &&
            f.request.loggedDate <= nextListingDate + 2000
        );

        const extractFilename = (text: string) => {
          const m = text.match(/filename="([^"]+)"/);
          return m ? m[1] : null;
        };

        const imgsToUse = associatedImages.length > 0 ? associatedImages : imageReqs;
        const filesToUse = associatedFiles.length > 0 ? associatedFiles : fileReqs;

        const parsedImages = imgsToUse
          .map((img) => {
            const fn = extractFilename(img.request.body || '');
            if (!fn) return null;
            return {
              filename: fn,
              url: fn.startsWith('mockup_') ? `/outputs/${fn}` : `/outputs/${fn}`,
            };
          })
          .filter(Boolean);

        const parsedFiles = filesToUse.map((f) => {
          const fn = extractFilename(f.request.body || '');
          return { filename: fn || 'digital_download.zip' };
        });

        const tagsRaw = params.get('tags') || '';
        const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : [];

        return {
          id: req.id || `mock-${index + 1}`,
          timestamp: loggedDate,
          dateFormatted: new Date(loggedDate).toLocaleString('he-IL', {
            dateStyle: 'medium',
            timeStyle: 'medium',
          }),
          title: params.get('title') || 'Untitled Listing',
          price: params.get('price') || '0.00',
          quantity: params.get('quantity') || '1',
          state: params.get('state') || 'draft',
          taxonomyId: params.get('taxonomy_id') || 'N/A',
          whoMade: params.get('who_made') || 'i_did',
          whenMade: params.get('when_made') || '2020_2024',
          isSupply: params.get('is_supply') === 'true',
          description: params.get('description') || '',
          tags,
          images: parsedImages,
          files: parsedFiles,
          imagesCount: parsedImages.length > 0 ? parsedImages.length : imageReqs.length,
          filesCount: parsedFiles.length > 0 ? parsedFiles.length : fileReqs.length,
          url: req.request.url,
        };
      });

      // Merge: newest listings first, deduplicate by title or id
      const existingTitles = new Set(parsedListings.map((l) => l.title));
      const olderSaved = savedListings.filter((l) => !existingTitles.has(l.title));
      activeListings = [...parsedListings, ...olderSaved];
      saveListings(activeListings);
    }

    const rawRequests = allRequests.slice(0, 30).map((r) => ({
      id: r.id,
      method: r.request.method,
      url: r.request.url,
      status: r.response?.status || 200,
      timestamp: r.request.loggedDate,
      dateFormatted: new Date(r.request.loggedDate).toLocaleTimeString('he-IL'),
    }));

    return NextResponse.json({
      connected: true,
      wiremockUrl: WIREMOCK_URL,
      listings: activeListings,
      totalRequests: allRequests.length,
      rawRequests,
    });
  } catch (err: any) {
    const savedListings = loadSavedListings();
    return NextResponse.json({
      connected: false,
      error: `Could not connect to WireMock on ${WIREMOCK_URL}. Make sure WireMock is running. (${err.message})`,
      listings: savedListings,
      rawRequests: [],
    });
  }
}

export async function DELETE() {
  try {
    saveListings([]);

    const res = await fetch(`${WIREMOCK_URL}/__admin/requests`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to reset WireMock requests journal' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'WireMock journal and saved listings cleared' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
