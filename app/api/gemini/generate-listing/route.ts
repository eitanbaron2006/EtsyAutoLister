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

    const text = response.text;
    if (!text) {
      const finishReason = response.candidates?.[0]?.finishReason;
      throw new Error(
        `Gemini returned an empty response${finishReason ? ` (finish reason: ${finishReason})` : ''}. Try again, or with fewer/smaller images.`
      );
    }

    const result = JSON.parse(text);
    if (
      typeof result.title !== 'string' || !result.title.trim() ||
      typeof result.description !== 'string' ||
      !Array.isArray(result.tags)
    ) {
      throw new Error('Gemini response is missing required listing fields (title/description/tags).');
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Gemini error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
