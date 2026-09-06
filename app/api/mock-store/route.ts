import { NextResponse } from 'next/server';

const WIREMOCK_URL = process.env.ETSY_API_BASE_URL || 'http://127.0.0.1:8080';

export async function GET() {
  try {
    const res = await fetch(`${WIREMOCK_URL}/__admin/requests`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({
        connected: false,
        error: `WireMock returned status ${res.status}`,
        listings: [],
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

    // Parse each listing creation
    const listings = createListingReqs.map((req, index) => {
      const loggedDate = req.request.loggedDate || Date.now();
      const body = req.request.body || '';
      const params = new URLSearchParams(body);

      // Associated images / files uploaded after this listing or overall
      // If there's 1 listing, assign all images/files uploaded near this time
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
        imagesCount: associatedImages.length > 0 ? associatedImages.length : imageReqs.length,
        filesCount: associatedFiles.length > 0 ? associatedFiles.length : fileReqs.length,
        url: req.request.url,
      };
    });

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
      listings,
      totalRequests: allRequests.length,
      rawRequests,
    });
  } catch (err: any) {
    return NextResponse.json({
      connected: false,
      error: `Could not connect to WireMock on ${WIREMOCK_URL}. Make sure WireMock is running. (${err.message})`,
      listings: [],
      rawRequests: [],
    });
  }
}

export async function DELETE() {
  try {
    const res = await fetch(`${WIREMOCK_URL}/__admin/requests`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to reset WireMock requests journal' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'WireMock journal cleared successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
