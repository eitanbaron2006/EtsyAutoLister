// Authentication, wrapped so the UI never imports a provider SDK directly.
//
// AppUser deliberately keeps the `uid` / `email` / `displayName` / `photoURL`
// shape the components already used, so swapping the provider underneath did
// not ripple through 23 call sites.

import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  /** ISO 8601 timestamp of account creation. */
  createdAt: string | null;
}

export function mapUser(user: SupabaseUser | null | undefined): AppUser | null {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const pick = (...keys: string[]): string | null => {
    for (const key of keys) {
      const value = meta[key];
      if (typeof value === 'string' && value.trim()) return value;
    }
    return null;
  };

  return {
    uid: user.id,
    email: user.email ?? null,
    displayName: pick('full_name', 'name', 'user_name'),
    photoURL: pick('avatar_url', 'picture'),
    createdAt: user.created_at ?? null,
  };
}

/**
 * Fires immediately with the current session, then on every auth change —
 * matching the onAuthStateChanged contract the app was written against.
 */
export function onAuthStateChange(
  callback: (user: AppUser | null) => void,
): () => void {
  let disposed = false;

  void supabase.auth.getSession().then(({ data }) => {
    if (!disposed) callback(mapUser(data.session?.user));
  });

  const { data } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
    if (!disposed) callback(mapUser(session?.user));
  });

  return () => {
    disposed = true;
    data.subscription.unsubscribe();
  };
}

/** Thrown when the Supabase stack has no Google provider configured. */
export class ProviderNotEnabledError extends Error {
  constructor(provider: string) {
    super(`Sign-in provider "${provider}" is not enabled on this Supabase project.`);
    this.name = 'ProviderNotEnabledError';
  }
}

/**
 * True when GoTrue reports the provider as configured. Checked up front
 * because signInWithOAuth navigates the browser rather than returning an
 * error — a disabled provider would otherwise dead-end on a raw 400 page.
 */
export async function isProviderEnabled(provider: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_ANON_KEY } });
    if (!res.ok) return false;
    const settings = await res.json();
    return settings?.external?.[provider] === true;
  } catch {
    return false;
  }
}

export async function signInWithGoogle(): Promise<void> {
  if (!(await isProviderEnabled('google'))) {
    throw new ProviderNotEnabledError('google');
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) throw error;
}

/**
 * Email/password sign-in. The local stack has email confirmations disabled, so
 * this is the fastest way to get a working session before Google OAuth
 * credentials are configured in supabase/config.toml.
 */
export async function signInWithPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpWithPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
