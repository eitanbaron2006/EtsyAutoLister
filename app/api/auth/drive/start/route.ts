// Begins the Google Drive consent flow.
//
// Separate from signing in. Signing in proves who the shop is; this asks for
// somewhere to put files Etsy will not carry, and a shop that never sells an
// oversize set never needs to grant it.

import { NextResponse } from 'next/server';
import { currentUserId, DRIVE_SCOPE } from '@/lib/drive-token';

export async function GET(request: Request) {
  const { origin } = new URL(request.url);

  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.redirect(`${origin}/?drive_error=${encodeURIComponent('Sign in first.')}`);
  }

  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(
      `${origin}/?drive_error=${encodeURIComponent('Google Drive is not configured on this server.')}`,
    );
  }

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
