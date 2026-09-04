// The Etsy access token, on the server and nowhere else.
//
// It used to be handed to the page by the OAuth callback, kept in React state,
// and posted back with every publish. Now the callback writes it here and the
// publish route reads it here; the browser is told only that an account is
// connected.
//
// `public.etsy_tokens` has row level security on and no policies, so neither
// the anon nor the authenticated role can reach it. These functions use the
// service role, which bypasses RLS -- which is why this module must never be
// imported into anything that ships to the browser.

import 'server-only';

import { createClient as createServiceClient } from '@supabase/supabase-js';

import { createClient as createSessionClient } from '@/lib/supabase-server';

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_SECRET_KEY is not configured; the Etsy token cannot be read or written.');
  }
  return createServiceClient(url, key, { auth: { persistSession: false } });
}

/** Who is asking, according to the session cookies. */
export async function currentUserId(): Promise<string | null> {
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function storeEtsyToken(
  userId: string,
  token: { accessToken: string; refreshToken?: string; expiresInSeconds?: number },
): Promise<void> {
  const expiresAt = token.expiresInSeconds
    ? new Date(Date.now() + token.expiresInSeconds * 1000).toISOString()
    : null;

  const { error } = await serviceClient()
    .from('etsy_tokens')
    .upsert(
      {
        user_id: userId,
        access_token: token.accessToken,
        refresh_token: token.refreshToken ?? null,
        expires_at: expiresAt,
      },
      { onConflict: 'user_id' },
    );
  if (error) throw new Error(`Could not store the Etsy token: ${error.message}`);
}

/** The token for whoever is signed in, or null if there is none. */
export async function readEtsyToken(userId: string): Promise<string | null> {
  const { data, error } = await serviceClient()
    .from('etsy_tokens')
    .select('access_token')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('Could not read the Etsy token', error.message);
    return null;
  }
  return (data?.access_token as string) ?? null;
}

export async function forgetEtsyToken(userId: string): Promise<void> {
  const { error } = await serviceClient().from('etsy_tokens').delete().eq('user_id', userId);
  if (error) console.error('Could not remove the Etsy token', error.message);
}
