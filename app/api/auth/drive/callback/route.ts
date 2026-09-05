// Exchanges the Drive consent code for a grant, and stores it server-side.
//
// This runs inside a popup, the way the Etsy connect flow already does. It
// answers with a page that posts the outcome back to the opener and closes
// itself, so the shop's draft, its scroll position and whatever dialog was
// open are all still there — none of it is ever unloaded.
//
// The alternative, redirecting the whole tab and reassembling the workspace
// afterwards, was tried first and is not worth the machinery: the app reloads
// into the projects hub with no session, no mode and no category, and every
// one of those has to be rebuilt before the draft dialog is even mounted.
//
// The token never reaches the page. What crosses the postMessage boundary is
// whether it worked and which account was connected.

import { NextResponse } from 'next/server';
import { currentUserId, storeDriveGrant } from '@/lib/drive-token';

/** A page that hands the outcome to the opener and gets out of the way. */
function reply(origin: string, payload: Record<string, unknown>) {
  const html = `<!doctype html>
<html>
  <body style="font-family:system-ui;background:#12110c;color:#f7f1de;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
    <p>${payload.ok ? 'Google Drive connected.' : 'Google Drive was not connected.'} You can close this window.</p>
    <script>
      (function () {
        var payload = ${JSON.stringify(payload)};
        if (window.opener) {
          window.opener.postMessage(payload, ${JSON.stringify(origin)});
          window.close();
        } else {
          // Opened without a parent — a blocked popup, or a pasted URL.
          // Fall back to the old behaviour rather than stranding the tab.
          window.location.href = '/' + (payload.ok ? '?drive_connected=1' : '?drive_error=' + encodeURIComponent(String(payload.error || '')));
        }
      })();
    </script>
  </body>
</html>`;
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const fail = (message: string) =>
    reply(origin, { type: 'DRIVE_AUTH_RESULT', ok: false, error: message });

  // The shop declining is an answer, not a fault.
  const denied = searchParams.get('error');
  if (denied) return fail(denied === 'access_denied' ? 'Drive was not connected.' : denied);

  const code = searchParams.get('code');
  if (!code) return fail('Google did not return an authorization code.');

  const userId = await currentUserId();
  if (!userId) return fail('Your session ended before Drive could be connected. Sign in and try again.');

  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail('Google Drive is not configured on this server.');

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${origin}/api/auth/drive/callback`,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    const detail = (await tokenRes.text()).slice(0, 300);
    console.error('Drive token exchange failed', tokenRes.status, detail);
    return fail('Google refused the connection. Check the redirect URI registered for this client.');
  }

  const payload = await tokenRes.json();

  // Which account granted it — shown in the UI so a shop can tell it picked
  // the right one. Best effort: a missing address is not worth failing over.
  let accountEmail: string | null = null;
  try {
    const who = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${payload.access_token}` },
    });
    if (who.ok) accountEmail = (await who.json()).email ?? null;
  } catch {
    // ignored on purpose
  }

  try {
    await storeDriveGrant(userId, {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      expiresAt: new Date(Date.now() + (payload.expires_in ?? 3600) * 1000).toISOString(),
      accountEmail,
      scope: payload.scope,
    });
  } catch (err: any) {
    console.error('Could not store the Drive grant', err);
    return fail('Connected to Google, but the grant could not be saved.');
  }

  return reply(origin, { type: 'DRIVE_AUTH_RESULT', ok: true, accountEmail });
}
