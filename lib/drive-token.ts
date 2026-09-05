// The Google Drive grant, on the server and nowhere else.
//
// Same rule as lib/etsy-token.ts: `public.drive_tokens` has row level security
// on and no policies, so neither the anon nor the authenticated role can reach
// it. These functions use the service role, which bypasses RLS -- which is why
// this module must never be imported into anything that ships to the browser.
//
// The page is told only which account is connected, mirrored onto the profile
// where the owner can read it.

import 'server-only';

import { createClient as createServiceClient } from '@supabase/supabase-js';

import { createClient as createSessionClient } from '@/lib/supabase-server';

/**
 * Only the files this app creates. `drive.file` is the narrow scope: it grants
 * nothing over anything the shop already has in Drive, which is both the right
 * amount of access and the difference between a consent screen a shop will
 * accept and one it will not.
 */
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_SECRET_KEY is not configured; the Drive grant cannot be read or written.');
  }
  return createServiceClient(url, key, { auth: { persistSession: false } });
}

export async function currentUserId(): Promise<string | null> {
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export interface DriveGrant {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
  accountEmail?: string | null;
  scope?: string | null;
}

export async function storeDriveGrant(userId: string, grant: DriveGrant): Promise<void> {
  const service = serviceClient();

  const { error } = await service.from('drive_tokens').upsert(
    {
      user_id: userId,
      access_token: grant.accessToken,
      // Google returns a refresh token only on the first consent, so a
      // reconnect without `prompt=consent` would otherwise blank it.
      ...(grant.refreshToken ? { refresh_token: grant.refreshToken } : {}),
      expires_at: grant.expiresAt ?? null,
      account_email: grant.accountEmail ?? null,
      scope: grant.scope ?? null,
    },
    { onConflict: 'user_id' },
  );
  if (error) throw new Error(`Could not store the Drive grant: ${error.message}`);

  // Mirrored so the page can say "Connected as ..." without seeing a token.
  await service.from('profiles')
    .update({ drive_account_email: grant.accountEmail ?? null })
    .eq('id', userId);
}

export async function forgetDriveGrant(userId: string): Promise<void> {
  const service = serviceClient();
  const { error } = await service.from('drive_tokens').delete().eq('user_id', userId);
  if (error) console.error('Could not remove the Drive grant', error.message);
  await service.from('profiles').update({ drive_account_email: null }).eq('id', userId);
}

/**
 * A usable access token, refreshed if the stored one has expired.
 *
 * Returns null rather than throwing when there is no grant: not being
 * connected is an ordinary state, and the caller has something to say about it.
 */
export async function readDriveAccessToken(userId: string): Promise<string | null> {
  const service = serviceClient();
  const { data, error } = await service
    .from('drive_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Could not read the Drive grant', error.message);
    return null;
  }
  if (!data) return null;

  // A minute of slack: a token that expires while the request is in flight is
  // the same as one that has already expired.
  const expiresAt = data.expires_at ? Date.parse(data.expires_at) : 0;
  if (!expiresAt || expiresAt - 60_000 > Date.now()) return data.access_token as string;

  if (!data.refresh_token) {
    console.error('The Drive grant has expired and carries no refresh token; the shop must reconnect.');
    return null;
  }

  const refreshed = await refreshAccessToken(data.refresh_token as string);
  if (!refreshed) return null;

  await service.from('drive_tokens').update({
    access_token: refreshed.accessToken,
    expires_at: refreshed.expiresAt,
  }).eq('user_id', userId);

  return refreshed.accessToken;
}

async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt: string } | null> {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error('GOOGLE_DRIVE_CLIENT_ID / _SECRET are not configured.');
    return null;
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    console.error('Refreshing the Drive token failed', res.status, (await res.text()).slice(0, 300));
    return null;
  }
  const payload = await res.json();
  return {
    accessToken: payload.access_token as string,
    expiresAt: new Date(Date.now() + (payload.expires_in ?? 3600) * 1000).toISOString(),
  };
}
