import { NextResponse } from 'next/server';
import { currentUserId, storeEtsyToken } from '@/lib/etsy-token';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // We actually need the cookie. Since it's server-side NextRequest is better,
  // but we can parse the cookie from headers. Or import { cookies } from 'next/headers';
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(cookieHeader.split('; ').map(c => {
    const [key, ...v] = c.split('=');
    return [key, v.join('=')];
  }));

  const savedState = cookies['etsy_oauth_state'];
  const verifier = cookies['etsy_oauth_verifier'];

  if (!code || !state || state !== savedState || !verifier) {
    return new NextResponse('Invalid state, code, or verifier. Please try again.', { status: 400 });
  }

  const clientId = process.env.ETSY_API_KEY;
  const envAppUrl = process.env.APP_URL || 'http://localhost:3000';
  const redirectUri = `${envAppUrl}/api/auth/etsy/callback`;
  const etsyBase = process.env.ETSY_API_BASE_URL || 'https://api.etsy.com';

  try {
    const response = await fetch(`${etsyBase}/v3/public/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: redirectUri,
        code,
        code_verifier: verifier,
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('Failed to exchange token', errorData);
      return new NextResponse(`Token exchange failed.`, { status: 400 });
    }

    const data = await response.json();
    
    // The token is stored server-side and never reaches the page. It used to be
    // posted to `window.opener` with '*' as the target origin -- to whatever
    // window happened to be listening -- and the page then kept it in state and
    // sent it back with every publish.
    const userId = await currentUserId();
    if (!userId) {
      return new NextResponse('Sign in before connecting Etsy.', { status: 401 });
    }
    try {
      await storeEtsyToken(userId, {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresInSeconds: data.expires_in,
      });
    } catch (storeError) {
      console.error('Could not store the Etsy token', storeError);
      return new NextResponse('Connected to Etsy, but the token could not be saved.', { status: 500 });
    }
    const appOrigin = new URL(envAppUrl).origin;
    
    const html = `
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, ${JSON.stringify(appOrigin)});
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (err) {
    console.error('Callback error', err);
    return new NextResponse(`An error occurred.`, { status: 500 });
  }
}
