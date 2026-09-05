// The connected shop's own name and look, read from Etsy.
//
// Server-only: reading it needs the Etsy token, which never leaves the server.
// Cached on the profile because the delivery PDF is built on every oversize
// publish, and that is not a reason to call Etsy each time.

import 'server-only';

import { createClient as createServiceClient } from '@supabase/supabase-js';

import { readEtsyToken } from '@/lib/etsy-token';
import type { ShopBranding } from '@/lib/pdf-presets';

/** Re-read when the cached copy is older than this. */
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('SUPABASE_SECRET_KEY is not configured.');
  return createServiceClient(url, key, { auth: { persistSession: false } });
}

async function fetchFromEtsy(token: string): Promise<ShopBranding | null> {
  const apiKey = process.env.ETSY_API_KEY;
  if (!apiKey) return null;

  const headers = { Authorization: `Bearer ${token}`, 'x-api-key': apiKey };

  const me = await fetch('https://api.etsy.com/v3/application/users/me', { headers });
  if (!me.ok) return null;
  const userId = (await me.json()).user_id;

  const shops = await fetch(`https://api.etsy.com/v3/application/users/${userId}/shops`, { headers });
  if (!shops.ok) return null;
  const shop = await shops.json();

  return {
    shopId: shop.shop_id,
    shopName: shop.shop_name,
    title: shop.title ?? undefined,
    announcement: shop.announcement ?? undefined,
    iconUrl: shop.icon_url_fullxfull ?? undefined,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * The shop's branding, from cache or from Etsy.
 *
 * Never throws and never blocks a delivery: a shop that cannot be read still
 * gets a sheet, just one carrying whatever it has set by hand and the preset's
 * own defaults.
 */
export async function getShopBranding(userId: string): Promise<ShopBranding> {
  const service = serviceClient();
  const { data } = await service
    .from('profiles')
    .select('shop_branding')
    .eq('id', userId)
    .maybeSingle();

  const cached = (data?.shop_branding ?? {}) as ShopBranding;
  const age = cached.fetchedAt ? Date.now() - Date.parse(cached.fetchedAt) : Infinity;
  if (cached.shopName && age < STALE_AFTER_MS) return cached;

  try {
    const token = await readEtsyToken(userId);
    if (!token) return cached;
    const fresh = await fetchFromEtsy(token);
    if (!fresh) return cached;

    // Anything the shop set by hand survives the refresh.
    const merged: ShopBranding = { ...fresh, accentColor: cached.accentColor ?? fresh.accentColor };
    await service.from('profiles').update({ shop_branding: merged }).eq('id', userId);
    return merged;
  } catch (err) {
    console.warn('Could not refresh the shop branding', err);
    return cached;
  }
}

/** The shop's icon, ready to embed. Best effort — a sheet without it is fine. */
export async function fetchLogo(
  iconUrl?: string,
): Promise<{ bytes: Uint8Array; type: 'png' | 'jpg' } | null> {
  if (!iconUrl) return null;
  try {
    const res = await fetch(iconUrl);
    if (!res.ok) return null;
    const type = res.headers.get('content-type') || '';
    // pdf-lib embeds PNG and JPEG only; anything else is skipped rather than
    // guessed at, because a wrong guess throws inside the PDF build.
    if (!/png|jpe?g/i.test(type)) return null;
    return {
      bytes: new Uint8Array(await res.arrayBuffer()),
      type: /png/i.test(type) ? 'png' : 'jpg',
    };
  } catch {
    return null;
  }
}
