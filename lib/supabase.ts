// Supabase browser client. Replaces lib/firebase.ts as the app's backend.
//
// Local dev points at the project's own Docker stack (port block 573xx) —
// see .env.local and supabase/config.toml.

import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env.local and run `npx supabase start`.',
  );
}

export const supabase = createBrowserClient(url, anonKey);

/** Base URL + publishable key, for the few direct REST calls (e.g. GoTrue settings). */
export const SUPABASE_URL = url;
export const SUPABASE_ANON_KEY = anonKey;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

/**
 * Mirrors the old handleFirestoreError contract: log a structured record and
 * throw, so existing call-site try/catch blocks keep working unchanged.
 */
export function handleDbError(error: unknown, operationType: OperationType, path: string | null): never {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    'Supabase Error: ',
    JSON.stringify({ error: message, operationType, path }),
  );
  throw error instanceof Error ? error : new Error(message);
}
