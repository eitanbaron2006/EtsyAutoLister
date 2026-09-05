// Begins the Google Drive consent flow, inside a popup.
//
// Separate from signing in. Signing in proves who the shop is; this asks for
// somewhere to put files Etsy will not carry, and a shop that never sells an
// oversize set never needs to grant it.
//
// Failures answer with a page that reports back to the opener rather than a
// redirect: the caller is a popup, and redirecting it leaves a stray window
// showing an error the app never hears about.

import { NextResponse } from 'next/server';
import { currentUserId, DRIVE_SCOPE } from '@/lib/drive-token';

function refuse(origin: string, message: string) {
  const payload = { type: 'DRIVE_AUTH_RESULT', ok: false, error: message };
  const html = `<!doctype html>
<html>
  <body style="font-family:system-ui;background:#12110c;color:#f7f1de;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
    <p>${message}</p>
    <script>
      (function () {
        if (window.opener) {
          window.opener.postMessage(${JSON.stringify(payload)}, ${JSON.stringify(origin)});
          window.close();
        }
      })();
    </script>
  </body>
</html>`;
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
}

export async function GET(request: Request) {
  const { origin } = new URL(request.url);

  const userId = await currentUserId();
  if (!userId) return refuse(origin, 'Sign in first.');

  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  if (!clientId) return refuse(origin, 'Google Drive is not configured on this server.');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/auth/drive/callback`,
    response_type: 'code',
    scope: `${DRIVE_SCOPE} https://www.googleapis.com/auth/userinfo.email`,
    // offline + consent is what produces a refresh token. Without both, the
    // grant lasts an hour and the shop is asked to reconnect every session.
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
