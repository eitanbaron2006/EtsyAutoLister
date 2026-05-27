export function buildListingContents(folderName: string, images: string[]) {
  const parts: any[] = [];

  parts.push({
    text: `Analyze the provided product thumbnail images and the folder name: "${folderName}".
      Generate a professional Etsy listing for a digital product.
      In the description, make it engaging and explain what the product is, its benefits, and how it can be used.
      Provide relevant SEO tags for Etsy.
      Provide a rough estimated price in USD for this kind of digital product.`
  });

  for (const image of images) {
    // Assuming images is an array of base64 strings
    // Format: data:image/png;base64,...
    const mimeTypeMatch = image.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    parts.push({
      inlineData: {
        mimeType,
        data: base64Data
      }
    });
  }

  return { role: 'user' as const, parts };
}
