import { NextResponse } from 'next/server';

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

  try {
    const response = await fetch('https://api.etsy.com/v3/public/oauth/token', {
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
    
    // In a real app we'd save this to a DB. For this stateless tool, 
    // we'll pass the token back via postMessage to the client for temporary usage.
    const accessToken = data.access_token;
    
    const html = `
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: '${accessToken}' }, '*');
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
