import { NextRequest, NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { createListingAiClient } from './ai-config';
import { buildListingContents } from './listing-contents';

// Retry & timeout policy.
//
// Measured: a single 48KB image through Vertex (gemini-3.1-pro-preview) takes
// ~15.6s end to end. A real run sends several 1024px images, so the old 8s
// budget expired before the model could ever answer — every attempt timed out
// and the stage always failed with "the AI server took too long".
//
// 75s per attempt leaves generous headroom over the measured latency. With a
// real budget, timeouts are exceptional rather than routine, so two attempts
// are enough: worst case is ~152s instead of an endless wait.
//
// NOTE: keep STALE_PIPELINE_MS in lib/listings-repo.ts comfortably above this
// worst case, or the stalled-run sweep could release a run still in flight.
const AI_TIMEOUT_MS = 75_000;       // 75 seconds per attempt
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2_000;       // 2 seconds between retries

interface AiGenerationResult {
  title: string;
  description: string;
  tags: string[];
  price: number;
}

/**
 * Attempt a single Gemini generation with a Promise.race-based timeout.
 * Returns the parsed result or throws a descriptive error.
 */
async function attemptGeneration(
  ai: any,
  model: string,
  folderName: string,
  images: string[],
  attempt: number,
): Promise<AiGenerationResult> {
  // Use Promise.race to enforce timeout since the @google/genai library
  // may not accept AbortSignal in its options parameter.
  const generationPromise = ai.models.generateContent({
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

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      const timeoutError = new Error(`Gemini AI did not respond within ${AI_TIMEOUT_MS / 1000}s (attempt ${attempt}/${MAX_RETRIES})`);
      (timeoutError as any).code = 'UND_ERR_HEADERS_TIMEOUT';
      (timeoutError as any).name = 'AbortError';
      reject(timeoutError);
    }, AI_TIMEOUT_MS);
  });

  const response = await Promise.race([generationPromise, timeoutPromise]);

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

  return {
    title: result.title,
    description: result.description,
    tags: result.tags.slice(0, 13),
    price: typeof result.price === 'number' && Number.isFinite(result.price) ? result.price : 5.00,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { folderName, images } = await req.json();
    const { ai, model } = createListingAiClient();

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await attemptGeneration(ai, model, folderName, images, attempt);
        // Success — return the result immediately
        return NextResponse.json(result);
      } catch (err: any) {
        lastError = err;

        // Determine if this error is worth retrying
        const isTimeout = err.name === 'AbortError'
          || err.code === 'UND_ERR_HEADERS_TIMEOUT'
          || err.message?.toLowerCase().includes('timeout')
          || err.message?.toLowerCase().includes('abort');
        const isRetryable = isTimeout
          || err.message?.toLowerCase().includes('fetch failed')
          || err.message?.toLowerCase().includes('network')
          || err.message?.toLowerCase().includes('econnrefused')
          || err.message?.toLowerCase().includes('econnreset')
          || err.message?.toLowerCase().includes('quota')
          || err.message?.toLowerCase().includes('rate_limit')
          || err.message?.toLowerCase().includes('overloaded')
          || err.message?.toLowerCase().includes('unavailable');

        if (attempt < MAX_RETRIES && isRetryable) {
          // Wait before retrying
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
          console.warn(
            `Gemini attempt ${attempt}/${MAX_RETRIES} failed — retrying in ${RETRY_DELAY_MS}ms. ` +
            `Error: ${err.message || 'Unknown'}`
          );
          continue;
        }

        // Last attempt or non-retryable error — break out
        break;
      }
    }

    // All attempts exhausted
    const error = lastError!;
    const isTimeout = error.name === 'AbortError'
      || (error as any).code === 'UND_ERR_HEADERS_TIMEOUT'
      || error.message?.toLowerCase().includes('timeout');

    if (isTimeout) {
      return NextResponse.json({
        error: `Gemini AI did not respond after ${MAX_RETRIES} attempts (${AI_TIMEOUT_MS / 1000}s timeout each). The server may be overloaded or unavailable. Please try again later or use smaller images.`,
        code: 'AI_TIMEOUT',
        retryable: true,
      }, { status: 504 });
    }

    // Quota / rate-limit errors
    if (error.message?.toLowerCase().includes('quota') || error.message?.toLowerCase().includes('rate_limit')) {
      return NextResponse.json({
        error: 'Gemini API quota exceeded. Please try again later or check your billing plan.',
        code: 'QUOTA_EXCEEDED',
        retryable: true,
      }, { status: 429 });
    }

    console.error('Gemini error after all retries:', error);
    return NextResponse.json({ error: error.message, code: 'AI_ERROR', retryable: false }, { status: 500 });
  } catch (err: any) {
    console.error('Gemini route error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
