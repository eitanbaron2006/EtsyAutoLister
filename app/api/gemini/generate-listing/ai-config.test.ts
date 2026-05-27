import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_VERTEX_LOCATION,
  DEFAULT_VERTEX_MODEL,
  DEFAULT_VERTEX_PROJECT_ID,
  resolveListingAiConfig,
} from './ai-config';

test('uses the existing Gemini API model when an API key exists', () => {
  const config = resolveListingAiConfig({ GEMINI_API_KEY: 'api-key' });

  assert.equal(config.model, DEFAULT_GEMINI_MODEL);
  assert.deepEqual(config.clientOptions, {
    apiKey: 'api-key',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
});

test('uses Vertex Gemini 3.1 Pro with MockupGen defaults when the API key is absent', () => {
  const config = resolveListingAiConfig({});

  assert.equal(config.model, DEFAULT_VERTEX_MODEL);
  assert.deepEqual(config.clientOptions, {
    vertexai: true,
    project: DEFAULT_VERTEX_PROJECT_ID,
    location: DEFAULT_VERTEX_LOCATION,
  });
});

test('allows Vertex settings to be supplied by server environment variables', () => {
  const config = resolveListingAiConfig({
    VERTEX_PROJECT_ID: 'configured-project',
    VERTEX_LOCATION: 'configured-location',
    VERTEX_MODEL: 'configured-model',
  });

  assert.equal(config.model, 'configured-model');
  assert.deepEqual(config.clientOptions, {
    vertexai: true,
    project: 'configured-project',
    location: 'configured-location',
  });
});
