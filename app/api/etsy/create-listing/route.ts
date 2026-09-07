import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

import { currentUserId, readEtsyToken } from '@/lib/etsy-token';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    // The demo path is the only one the page still names a token on. The real
    // one is read here, from a table no client role can reach, for whoever the
    // session cookies say is asking.
    const declared = formData.get('token') as string | null;
    const isMockServer = !!process.env.ETSY_API_BASE_URL;

    let token = declared === 'DEMO_TOKEN' && !isMockServer
      ? declared
      : await (async () => {
          const userId = await currentUserId();
          return userId ? await readEtsyToken(userId) : null;
        })();

    // When running with WireMock / local mock server, allow fallback mock token
    if (!token && isMockServer) {
      token = 'mock_wiremock_token';
    }
    
    if (!token) {
      return NextResponse.json({ error: 'Missing Etsy access token. Connect your account first.' }, { status: 401 });
    }

    if (token === 'DEMO_TOKEN' && !isMockServer) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      return NextResponse.json({
        success: true,
        listingId: `demo_${Math.floor(Math.random() * 1000000)}`,
        url: 'https://etsy.com/your/shops/me/tools/listings'
      });
    }

    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const tags = formData.getAll('tags') as string[];
    const price = parseFloat(formData.get('price') as string);
    const quantity = 999; 

    const etsyBase = process.env.ETSY_API_BASE_URL || 'https://api.etsy.com';

    // Retrieve the user ID
    const userRes = await fetch(`${etsyBase}/v3/application/users/me`, {
      headers: { 
        'x-api-key': process.env.ETSY_API_KEY!,
        'Authorization': `Bearer ${token}` 
      }
    });

    if (!userRes.ok) throw new Error('Failed to get Etsy user info: ' + await userRes.text());
    const userData = await userRes.json();
    const userId = userData.user_id;

    // Retrieve the shop
    const shopRes = await fetch(`${etsyBase}/v3/application/users/${userId}/shops`, {
      headers: {
        'x-api-key': process.env.ETSY_API_KEY!,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!shopRes.ok) throw new Error('Failed to get Etsy shop info: ' + await shopRes.text());
    const shopData = await shopRes.json();
    const shopId = shopData.shop_id;

    // Create Draft Listing
    const createParams = new URLSearchParams({
      quantity: quantity.toString(),
      title: title.slice(0, 140),
      description: description,
      price: price.toFixed(2),
      who_made: 'i_did',
      when_made: '2020_2024',
      taxonomy_id: '10855', // Digital Prints (approximate)
      is_supply: 'false',
      type: 'download',
      state: 'draft',
      should_auto_renew: 'true',
    });

    // Add tags (comma separated)
    if (tags.length > 0) {
      createParams.append('tags', tags.slice(0, 13).join(','));
    }

    const createListingRes = await fetch(`${etsyBase}/v3/application/shops/${shopId}/listings`, {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ETSY_API_KEY!,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: createParams
    });

    if (!createListingRes.ok) throw new Error('Failed to create listing: ' + await createListingRes.text());
    const listingData = await createListingRes.json();
    const listingId = listingData.listing_id;

    // Upload images with explicit rank numbering
    const imageFiles = formData.getAll('image') as File[];
    const ranks = formData.getAll('rank') as string[];

    // Ensure mock uploads folder exists to preserve actual image bytes for local simulation
    const mockUploadsDir = path.join(process.cwd(), 'public', 'mock-uploads');
    if (!fs.existsSync(mockUploadsDir)) {
      fs.mkdirSync(mockUploadsDir, { recursive: true });
    }

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      if (typeof file !== 'object') continue;
      const rank = ranks[i] ? parseInt(ranks[i], 10) : (i + 1);

      // Persist local copy so simulator always serves actual image data
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = file.name || `image_${rank}.jpg`;
        fs.writeFileSync(path.join(mockUploadsDir, filename), buffer);
      } catch (saveErr) {
        console.warn('Could not save image to public/mock-uploads:', saveErr);
      }

      const imageForm = new FormData();
      imageForm.append('image', file);
      imageForm.append('rank', rank.toString());
      const imgRes = await fetch(`${etsyBase}/v3/application/shops/${shopId}/listings/${listingId}/images`, {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ETSY_API_KEY!,
          'Authorization': `Bearer ${token}`
        },
        body: imageForm
      });
      if (!imgRes.ok) console.error(`Image upload failed for rank ${rank}:`, await imgRes.text());
    }

    // Upload downloadable files
    const deliverableFiles = formData.getAll('file') as File[];
    for (const file of deliverableFiles) {
      if (typeof file !== 'object') continue;
      const fileForm = new FormData();
      fileForm.append('file', file);
      fileForm.append('name', file.name || 'product_file');
      const fileRes = await fetch(`${etsyBase}/v3/application/shops/${shopId}/listings/${listingId}/files`, {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ETSY_API_KEY!,
          'Authorization': `Bearer ${token}`
        },
        body: fileForm
      });
      if (!fileRes.ok) console.error('File upload failed', await fileRes.text());
    }

    return NextResponse.json({ success: true, listingId, url: listingData.url });
  } catch (err: any) {
    console.error('Etsy Creation Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
