import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

export async function POST(req: NextRequest) {
  try {
    const { folderName, images } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

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

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "Etsy listing title, SEO friendly."
            },
            description: {
              type: Type.STRING,
              description: "The full body description for the Etsy listing."
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of 13 tags suitable for Etsy SEO (max 20 chars each)."
            },
            price: {
              type: Type.NUMBER,
              description: "Estimated price in USD (numeric)"
            }
          },
          required: ["title", "description", "tags", "price"]
        }
      }
    });

    const text = response.text || "{}";
    const result = JSON.parse(text);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Gemini error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
