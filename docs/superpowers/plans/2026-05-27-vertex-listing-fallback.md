# Vertex Listing Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/api/gemini/generate-listing` use Vertex AI with Gemini 3.1 Pro Preview when no Gemini API key is configured, without any UI changes.

**Architecture:** Keep the existing route contract, prompt, image payload, and JSON schema intact. Add a small server-only configuration module that selects API-key mode or Vertex AI mode, gives the route the appropriate `GoogleGenAI` client plus model ID, and is directly covered by a focused unit test. The Vertex default was verified against the live Model Garden catalog for `vertextai-project-497513` on 2026-05-27.

**Tech Stack:** Next.js route handlers, TypeScript, `@google/genai`, Node test runner via `tsx`, Google Application Default Credentials.

---

## File Map

| Path | Responsibility |
| --- | --- |
| `app/api/gemini/generate-listing/ai-config.ts` | Resolve provider/model configuration and construct the server-side `GoogleGenAI` client. |
| `app/api/gemini/generate-listing/ai-config.test.ts` | Assert existing API-key selection and new Vertex fallback defaults/overrides. |
| `app/api/gemini/generate-listing/listing-contents.ts` | Build the multimodal prompt with the Vertex-compatible `user` role. |
| `app/api/gemini/generate-listing/route.test.ts` | Assert request content contains the Vertex-required role. |
| `app/api/gemini/generate-listing/route.ts` | Consume the selected client and model while preserving request/response behavior. |
| `package.json`, `package-lock.json` | Add the narrow TypeScript test command and its runner dependency. |
| `.env.example` | Document optional API-key mode and Vertex fallback variables. |
| `README.md` | Document local ADC-based Vertex fallback setup. |

No task edits `app/page.tsx`, components, styling, layout, or labels.

### Task 1: Provider Selection Regression Test

**Files:**
- Create: `app/api/gemini/generate-listing/ai-config.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

- [x] **Step 1: Add the minimal TypeScript test runner dependency**

Run:

```powershell
npm install --save-dev tsx
```

Add the script generated around the existing scripts in `package.json`:

```json
"test": "tsx --test"
```

Expected: `tsx` appears under `devDependencies` and the lockfile records it.

- [x] **Step 2: Write failing tests for the desired provider configuration**

Create `app/api/gemini/generate-listing/ai-config.test.ts`:

```ts
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
```

- [x] **Step 3: Run the new test and verify RED**

Run:

```powershell
npm test -- app/api/gemini/generate-listing/ai-config.test.ts
```

Expected: FAIL because `./ai-config` does not yet exist.

### Task 2: Server-Only Vertex Fallback

**Files:**
- Create: `app/api/gemini/generate-listing/ai-config.ts`
- Modify: `app/api/gemini/generate-listing/route.ts`
- Test: `app/api/gemini/generate-listing/ai-config.test.ts`

- [x] **Step 1: Implement provider and model selection**

Create `app/api/gemini/generate-listing/ai-config.ts`:

```ts
import { GoogleGenAI } from '@google/genai';

export const DEFAULT_GEMINI_MODEL = 'gemini-3.1-pro-preview';
export const DEFAULT_VERTEX_PROJECT_ID = 'vertextai-project-497513';
export const DEFAULT_VERTEX_LOCATION = 'global';
export const DEFAULT_VERTEX_MODEL = 'gemini-3.1-pro-preview';

type ListingAiEnvironment = Partial<Pick<
  NodeJS.ProcessEnv,
  'GEMINI_API_KEY' | 'VERTEX_PROJECT_ID' | 'VERTEX_LOCATION' | 'VERTEX_MODEL'
>>;

export interface ListingAiConfig {
  clientOptions: ConstructorParameters<typeof GoogleGenAI>[0];
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
```

- [x] **Step 2: Route listing generation through the selected provider**

In `app/api/gemini/generate-listing/route.ts`, replace direct `GoogleGenAI`
construction and the hard-coded model:

```ts
import { Type } from '@google/genai';
import { createListingAiClient } from './ai-config';

// inside POST, after req.json()
const { ai, model } = createListingAiClient();

// inside ai.models.generateContent(...)
model,
```

Remove the `Missing GEMINI_API_KEY` branch; missing keys are now the condition
that selects Vertex AI.

- [x] **Step 3: Run tests and verify GREEN**

Run:

```powershell
npm test -- app/api/gemini/generate-listing/ai-config.test.ts
```

Expected: PASS for all three provider selection tests.

- [x] **Step 4: Commit the tested server behavior**

Run:

```powershell
git add package.json package-lock.json app/api/gemini/generate-listing/ai-config.ts app/api/gemini/generate-listing/ai-config.test.ts app/api/gemini/generate-listing/route.ts
git commit -m "feat: fall back to vertex for listing generation"
```

### Task 2A: Vertex Multimodal Request Compatibility

**Files:**
- Create: `app/api/gemini/generate-listing/listing-contents.ts`
- Create: `app/api/gemini/generate-listing/route.test.ts`
- Modify: `app/api/gemini/generate-listing/route.ts`
- Modify: `app/api/gemini/generate-listing/ai-config.ts`

- [x] **Step 1: Reproduce the Vertex route rejection**

Run the route with `GEMINI_API_KEY` unset and one inline image payload through
`tsx`.

Expected and observed before the fix: HTTP `500` with Vertex error
`Please use a valid role: user, model.`

- [x] **Step 2: Add a failing request-content regression test**

Create a test that requires `buildListingContents(...).role` to be `user`.

Expected and observed before the fix: FAIL because the builder was not yet
provided.

- [x] **Step 3: Build Vertex-compatible request contents**

Move prompt/image-part construction into `listing-contents.ts` and return:

```ts
return { role: 'user' as const, parts };
```

Have `route.ts` pass that value as `contents`. Keep the helper outside
`route.ts` because Next.js route modules cannot export arbitrary utilities.

- [x] **Step 4: Verify test, build, and live fallback behavior**

Run the focused tests and `npm run build`, then invoke the route without
`GEMINI_API_KEY` using ADC and an inline PNG.

Expected and observed after the fix: tests pass, build succeeds, and the
endpoint returns HTTP `200` with listing fields.

### Task 3: Configuration Documentation

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

- [x] **Step 1: Document the optional API key and Vertex fallback environment**

Replace the Gemini-only introduction in `.env.example` with:

```env
# Optional: when set, listing generation uses the Gemini API.
# When unset, listing generation falls back to Vertex AI through ADC.
GEMINI_API_KEY=""

# Vertex AI fallback for listing generation (server-side only).
VERTEX_PROJECT_ID="vertextai-project-497513"
VERTEX_LOCATION="global"
VERTEX_MODEL="gemini-3.1-pro-preview"
```

- [x] **Step 2: Document local Vertex authentication without changing the UI**

Update the local-run section in `README.md` to say that `GEMINI_API_KEY` is
optional and add:

````markdown
### Vertex AI fallback

When `GEMINI_API_KEY` is empty or omitted, `COMPILE LISTING` uses Vertex AI
server-side with `gemini-3.1-pro-preview` and the configured Google Cloud
project. Configure Application Default Credentials once:

```bash
gcloud auth application-default login
gcloud config set project vertextai-project-497513
gcloud auth application-default set-quota-project vertextai-project-497513
```

The fallback is implemented only in the server API route; it does not change
the app interface.
````

- [x] **Step 3: Run project verification**

Run:

```powershell
npm test -- app/api/gemini/generate-listing/ai-config.test.ts
npm run lint
npm run build
git diff --stat origin/main...HEAD
```

Expected: tests pass, lint exits successfully, build exits successfully, and
the changed paths do not include `app/page.tsx` or any UI component/style file.

- [x] **Step 4: Commit configuration documentation**

Run:

```powershell
git add .env.example README.md
git commit -m "docs: document vertex listing fallback setup"
```
