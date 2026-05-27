# Vertex Listing Generation Fallback Design

## Goal

Allow the existing `COMPILE LISTING` pipeline to generate listing copy through
Vertex AI when `GEMINI_API_KEY` is not configured, using the Google Cloud
project and Application Default Credentials already used by `MockupGen`.

## Scope

This change is server-side only.

- Do not edit `app/page.tsx`, visual styling, layout, labels, or client-side
  workflow.
- Preserve the current `/api/gemini/generate-listing` request and response
  contract.
- Preserve Gemini API-key behavior whenever `GEMINI_API_KEY` is present.
- Add Vertex AI as the automatic fallback only when that key is absent.

## Chosen Approach

The API route selects its Google Gen AI client from server configuration:

- With `GEMINI_API_KEY`, construct the existing API-key-backed client and keep
  the current configured model behavior.
- Without `GEMINI_API_KEY`, construct a Vertex AI client using ADC, project
  `vertextai-project-497513`, location `global`, and model
  `gemini-3-pro-preview`.

This is preferred over switching all calls to Vertex because it avoids
breaking existing deployments that deliberately provide an API key. It is
preferred over runtime retry/failover because an invalid key or provider error
should be visible instead of silently triggering a second billable request.

## Vertex Configuration

The fallback defaults match the existing Google Cloud setup while allowing
server-side overrides:

```env
VERTEX_PROJECT_ID=vertextai-project-497513
VERTEX_LOCATION=global
VERTEX_MODEL=gemini-3-pro-preview
```

Authentication uses Google Application Default Credentials available to the
server process, as in `MockupGen`. No credential or token is sent to the
browser.

`gemini-3-pro-preview` is selected because Google's Vertex AI documentation
describes Gemini 3 Pro as its most advanced reasoning Gemini model, and it
supports image input and structured output required by this route.

## Data Flow

1. The existing frontend sends `folderName` and preview images to
   `/api/gemini/generate-listing`.
2. The route builds the existing prompt, image parts, and JSON response schema.
3. The route selects either Gemini API-key mode or Vertex fallback mode based
   solely on whether `GEMINI_API_KEY` exists.
4. The selected model generates the same JSON result fields: `title`,
   `description`, `tags`, and `price`.
5. The frontend receives the same response shape and therefore requires no
   changes.

## Error Handling

- If the API key exists but is rejected, return its provider error as today;
  do not mask it with Vertex fallback.
- If the key is absent and ADC, Vertex access, project authorization, or model
  access fails, return a clear server error from the Vertex call.
- Do not silently use a weaker Vertex model if `gemini-3-pro-preview` is
  unavailable to the project.

## Verification

- Add server-level tests for provider selection:
  - API key configured: API-key-backed mode remains selected.
  - API key absent: Vertex AI mode is selected with the expected project,
    location, and `gemini-3-pro-preview` model.
- Run the repository lint/build verification applicable to the Next.js route.
- Where local ADC can be used safely, perform a credentialed request smoke
  test without changing any user interface code.

## Sources

- Google Cloud, Gemini 3 Pro on Vertex AI:
  <https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-pro>
- Google Cloud, Structured output:
  <https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/control-generated-output>
