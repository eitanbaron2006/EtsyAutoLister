// Where the shop is sent to authorise this app against its Etsy account.
//
// SETUP, once, and only once you have Etsy API access: the redirect URI built
// below must be registered verbatim in the Etsy Developer Portal, under your
// app's settings. Etsy refuses to redirect anywhere it was not told about, and
// compares character for character.
//
//     <APP_URL>/api/auth/etsy/callback
//
// It comes from APP_URL, not from the browser -- so the address you register
// has to match APP_URL, not whatever host you happen to be browsing on. With
// APP_URL unset this falls back to http://localhost:3000, and visiting the app
// on 127.0.0.1 then produces a mismatch that Etsy reports unhelpfully.
//
// The workspace used to print this address in a panel above the studio floor.
// It was removed: it is a one-time setup detail, and it displayed
// window.location.origin, which is not what is sent here -- so it could name
// an address that was never actually used.

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
