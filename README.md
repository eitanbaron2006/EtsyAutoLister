<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/076899c4-42f6-43e0-a3a0-cb6b2d35dfbc

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Optionally set `GEMINI_API_KEY` in `.env.local` to use the Gemini API directly.
   When it is omitted, listing generation uses the Vertex AI fallback below.
3. Run the app:
   `npm run dev`

### Vertex AI fallback

When `GEMINI_API_KEY` is empty or omitted, `COMPILE LISTING` uses Vertex AI
server-side with `gemini-3.1-pro-preview` and the configured Google Cloud
project. Add the fallback values to `.env.local`:

```env
VERTEX_PROJECT_ID="vertextai-project-497513"
VERTEX_LOCATION="global"
VERTEX_MODEL="gemini-3.1-pro-preview"
```

Configure Application Default Credentials and its quota project once:

```bash
gcloud auth application-default login
gcloud config set project vertextai-project-497513
gcloud auth application-default set-quota-project vertextai-project-497513
```

The fallback is implemented only in the server API route; it does not change
the app interface.
