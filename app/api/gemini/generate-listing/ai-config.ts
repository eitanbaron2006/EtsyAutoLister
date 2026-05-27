import { GoogleGenAI, type GoogleGenAIOptions } from '@google/genai';

export const DEFAULT_GEMINI_MODEL = 'gemini-3.1-pro-preview';
export const DEFAULT_VERTEX_PROJECT_ID = 'vertextai-project-497513';
export const DEFAULT_VERTEX_LOCATION = 'global';
export const DEFAULT_VERTEX_MODEL = 'gemini-3.1-pro-preview';

type ListingAiEnvironment = Partial<
  Pick<
    NodeJS.ProcessEnv,
    'GEMINI_API_KEY' | 'VERTEX_PROJECT_ID' | 'VERTEX_LOCATION' | 'VERTEX_MODEL'
  >
>;

export interface ListingAiConfig {
  clientOptions: GoogleGenAIOptions;
  model: string;
}

export function resolveListingAiConfig(
  env: ListingAiEnvironment = process.env,
): ListingAiConfig {
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (apiKey) {
    return {
      clientOptions: {
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      },
      model: DEFAULT_GEMINI_MODEL,
    };
  }

  return {
    clientOptions: {
      vertexai: true,
      project: env.VERTEX_PROJECT_ID?.trim() || DEFAULT_VERTEX_PROJECT_ID,
      location: env.VERTEX_LOCATION?.trim() || DEFAULT_VERTEX_LOCATION,
    },
    model: env.VERTEX_MODEL?.trim() || DEFAULT_VERTEX_MODEL,
  };
}

export function createListingAiClient(
  env: ListingAiEnvironment = process.env,
): { ai: GoogleGenAI; model: string } {
  const config = resolveListingAiConfig(env);

  return {
    ai: new GoogleGenAI(config.clientOptions),
    model: config.model,
  };
}
