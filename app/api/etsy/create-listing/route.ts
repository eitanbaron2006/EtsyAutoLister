import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const token = formData.get('token') as string;
    
    if (!token) {
      return NextResponse.json({ error: 'Missing Etsy access token. Connect your account first.' }, { status: 401 });
    }

    if (token === 'DEMO_TOKEN') {
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

    // Retrieve the user ID
    const userRes = await fetch('https://api.etsy.com/v3/application/users/me', {
      headers: { 
        'x-api-key': process.env.ETSY_API_KEY!,
        'Authorization': `Bearer ${token}` 
      }
    });

    if (!userRes.ok) throw new Error('Failed to get Etsy user info: ' + await userRes.text());
    const userData = await userRes.json();
    const userId = userData.user_id;

    // Retrieve the shop
    const shopRes = await fetch(`https://api.etsy.com/v3/application/users/${userId}/shops`, {
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

    const createListingRes = await fetch(`https://api.etsy.com/v3/application/shops/${shopId}/listings`, {
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

    // We expect files to be passed in FormData under 'image' or 'file'
    for (const [key, value] of formData.entries()) {
      if (key === 'image' && typeof value === 'object') {
        const imageForm = new FormData();
        imageForm.append('image', value);
        const imgRes = await fetch(`https://api.etsy.com/v3/application/shops/${shopId}/listings/${listingId}/images`, {
          method: 'POST',
          headers: {
            'x-api-key': process.env.ETSY_API_KEY!,
            'Authorization': `Bearer ${token}`
          },
          body: imageForm
        });
        if (!imgRes.ok) console.error('Image upload failed', await imgRes.text());
      }

      if (key === 'file' && typeof value === 'object') {
        const fileForm = new FormData();
        fileForm.append('file', value);
        fileForm.append('name', (value as unknown as File).name || 'product_file');
        const fileRes = await fetch(`https://api.etsy.com/v3/application/shops/${shopId}/listings/${listingId}/files`, {
          method: 'POST',
          headers: {
            'x-api-key': process.env.ETSY_API_KEY!,
            'Authorization': `Bearer ${token}`
          },
          body: fileForm
        });
        if (!fileRes.ok) console.error('File upload failed', await fileRes.text());
      }
    }

    return NextResponse.json({ success: true, listingId, url: listingData.url });
  } catch (err: any) {
    console.error('Etsy Creation Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
