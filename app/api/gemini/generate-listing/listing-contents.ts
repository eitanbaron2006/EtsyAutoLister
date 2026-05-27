export function buildListingContents(folderName: string, images: string[]) {
  const parts: any[] = [];

  parts.push({
    text: `Analyze the provided product thumbnail images and the folder name: "${folderName}".
      Generate a professional, high-converting Etsy listing draft for this digital product.
      
      CRITICAL REQUIREMENT FOR THE "description" FIELD:
      You MUST return the description in a beautifully structured, highly readable plain text format. The description will be uploaded directly to Etsy as plain text, so it must use standard keyboard characters but be meticulously styled using spaces, newlines, and list markers. 
      
      Strictly follow this exact professional template structure for the description, separating sections with blank lines:
      
      [1-2 sentences engaging, vivid introduction describing the visual style, colors, impasto textures, or aesthetic vibe of the product based on the thumbnail image and folder name. Make it feel premium.]
      
      WHY YOU WILL LOVE IT:
      • [Benefit 1 Title] — [Detailed description of benefit, e.g. Instant Transformation — Instantly download, print...]
      • [Benefit 2 Title] — [Detailed description of benefit]
      • [Benefit 3 Title] — [Detailed description of benefit]
      
      WHAT IS INCLUDED:
      • [Deliverable 1 Title] — [Details of files, e.g., high-resolution 300 DPI JPG files scalable in 20+ frame ratios]
      • [Deliverable 2 Title] — [Details of commercial license or bonuses if applicable]
      
      HOW TO PRINT / USE:
      • [Step 1 Title] — [Instructions, e.g., Download Immediately — Access your digital files right after purchase]
      • [Step 2 Title] — [Printing/Usage options, e.g., Print Your Way — Print at home, upload to a service, or use local print shops]
      
      PLEASE NOTE:
      • [Notice 1 Title] — [Digital delivery warning, e.g., Digital Download Only — This is a digital product; no physical items or frames will be shipped]
      • [Notice 2 Title] — [Color disclaimer, e.g., Color Variation — Colors may vary slightly due to different monitor/printer settings]
      
      Thank you for visiting our shop! If you have any questions or custom requests, feel free to send us a message.

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
