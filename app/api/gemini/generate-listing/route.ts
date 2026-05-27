import { NextRequest, NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { createListingAiClient } from './ai-config';
import { buildListingContents } from './listing-contents';

export async function POST(req: NextRequest) {
  try {
    const { folderName, images } = await req.json();
    const { ai, model } = createListingAiClient();

    const response = await ai.models.generateContent({
      model,
      contents: buildListingContents(folderName, images),
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
