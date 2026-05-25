import { NextResponse } from 'next/server';
import { generateCodeVerifier, generateCodeChallenge } from '@/lib/pkce';

export async function GET(request: Request) {
  const envAppUrl = process.env.APP_URL || 'http://localhost:3000';
  const redirectUri = `${envAppUrl}/api/auth/etsy/callback`;
  const clientId = process.env.ETSY_API_KEY;

  if (!clientId || clientId === 'YOUR_KEY') {
    return NextResponse.json({ demoMode: true });
  }

  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);
  const state = generateCodeVerifier(); // use unhashed random string for state 

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'listings_r listings_w shops_r',
    state: state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  const authUrl = `https://www.etsy.com/oauth/connect?${params.toString()}`;

  const response = NextResponse.json({ url: authUrl });
  
  // Set cookies for validation in the callback - Must use SameSite=None and Secure
  response.cookies.set('etsy_oauth_verifier', verifier, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 60 * 10, // 10 minutes
    path: '/'
  });
  
  response.cookies.set('etsy_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 60 * 10,
    path: '/'
  });

  return response;
}
