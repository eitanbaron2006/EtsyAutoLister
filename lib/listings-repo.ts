// Backend-agnostic data access for the AutoLister user profile + listings.
//
// Every database call in the app goes through this module. Nothing outside this
// file talks to Supabase for app data, so the storage backend stays swappable.
//
// Firestore's camelCase document fields map to snake_case Postgres columns via
// the explicit tables below. They are explicit rather than a generic camel<->
// snake converter because of one rename: the Etsy-assigned `listingId` becomes
// `etsy_listing_id`, since `id` is our own primary key.

import { supabase, handleDbError, OperationType } from '@/lib/supabase';
import type { ListingMetadata } from '@/lib/listing-types';

// ------------------------------------------------------------------ types --

export interface UserProfile {
  uid: string;
  email: string | null;
  etsyConnected: boolean;
  etsyToken?: string | null;
  lastProductType?: string | null;
  savedTips?: string[];
  plan?: string;
}

export type ProfilePatch = Partial<
  Pick<UserProfile, 'etsyConnected' | 'etsyToken' | 'lastProductType' | 'savedTips' | 'plan'>
>;

export interface NewListingInput {
  id: string;
  folderName: string;
  projectId?: string;
  projectName?: string;
  productType?: string;
  status?: ListingMetadata['status'];
}

export type ListingPatch = Partial<Omit<ListingMetadata, 'id'>>;

export type ListingsUnsubscribe = () => void;

// --------------------------------------------------------------- mapping --

const PROFILE_TO_COLUMN: Record<keyof ProfilePatch, string> = {
  etsyConnected: 'etsy_connected',
  etsyToken: 'etsy_token',
  lastProductType: 'last_product_type',
  savedTips: 'saved_tips',
  plan: 'plan',
};

const LISTING_TO_COLUMN: Record<string, string> = {
  id: 'id',
  folderName: 'folder_name',
  projectId: 'project_id',
  projectName: 'project_name',
  title: 'title',
  description: 'description',
  price: 'price',
  tags: 'tags',
  status: 'status',
  listingId: 'etsy_listing_id', // the id Etsy assigns after publishing
  listingUrl: 'listing_url',
  productType: 'product_type',
  pipelineStepText: 'pipeline_step_text',
  mockupImage: 'mockup_image',
  mockupNote: 'mockup_note',
  quantity: 'quantity',
  listingType: 'listing_type',
  renewalOption: 'renewal_option',
  whoMade: 'who_made',
  whenMade: 'when_made',
  category: 'category',
  shippingProfile: 'shipping_profile',
  isSupply: 'is_supply',
  sku: 'sku',
  primaryColor: 'primary_color',
  secondaryColor: 'secondary_color',
  occasion: 'occasion',
  holiday: 'holiday',
  personalizationEnabled: 'personalization_enabled',
  personalizationInstructions: 'personalization_instructions',
  materials: 'materials',
  productionPartners: 'production_partners',
};

const COLUMN_TO_LISTING: Record<string, string> = {
  ...Object.fromEntries(Object.entries(LISTING_TO_COLUMN).map(([field, column]) => [column, field])),
  // Read-only: the DB trigger owns updated_at, so it is deliberately absent
  // from LISTING_TO_COLUMN and can never be written by a caller.
  updated_at: 'updatedAt',
};

/**
 * Pipeline stages that only ever advance while the browser tab is driving
 * them. A row sitting in one of these is only meaningful if something is
 * actively working on it.
 */
export const IN_FLIGHT_STATUSES = ['scanning', 'mockups', 'thumbnail', 'compiling', 'seo'] as const;

/**
 * How long a row may sit in an in-flight status before it is considered
 * orphaned.
 *
 * This MUST stay comfortably above the longest legitimate run, otherwise the
 * sweep would kill work that is still in progress. The AI copy stage is the
 * slowest link: 2 attempts x 75s + a 2s retry delay ~= 152s worst case (see
 * app/api/gemini/generate-listing/route.ts), on top of mockup rendering. Ten
 * minutes clears that several times over.
 */
export const STALE_PIPELINE_MS = 10 * 60 * 1000;

type Row = Record<string, unknown>;

/** Postgres row -> ListingMetadata. */
function rowToListing(row: Row): ListingMetadata {
  const out: Row = {};
  for (const [column, value] of Object.entries(row)) {
    const field = COLUMN_TO_LISTING[column];
    if (!field || value === null || value === undefined) continue;
    // numeric columns can arrive as strings from PostgREST depending on the
    // column type — coerce so ListingMetadata.price is always a number
    out[field] = field === 'price' ? Number(value) : value;
  }
  return out as unknown as ListingMetadata;
}

/** Partial ListingMetadata -> column patch, dropping unmapped keys. */
function listingToRow(patch: Record<string, unknown>): Row {
  const out: Row = {};
  for (const [field, value] of Object.entries(patch)) {
    const column = LISTING_TO_COLUMN[field];
    if (column !== undefined) out[column] = value;
  }
  return out;
}

// ---------------------------------------------------------------- profile --

export async function getProfile(uid: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .maybeSingle();

  if (error) handleDbError(error, OperationType.GET, `profiles/${uid}`);
  if (!data) return null;

  return {
    uid: data.id,
    email: data.email ?? null,
    etsyConnected: data.etsy_connected === true,
    etsyToken: data.etsy_token ?? null,
    lastProductType: data.last_product_type ?? null,
    savedTips: Array.isArray(data.saved_tips) ? data.saved_tips : [],
    plan: typeof data.plan === 'string' ? data.plan : 'free',
  };
}

/**
 * Normally a no-op: the `on_auth_user_created` trigger inserts the profile row
 * at signup. Kept as a safety net for accounts created before that trigger.
 */
export async function createProfile(uid: string, email: string | null): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: uid, email: email ?? '', etsy_connected: false }, { onConflict: 'id' });

  if (error) handleDbError(error, OperationType.CREATE, `profiles/${uid}`);
}

export async function updateProfile(uid: string, patch: ProfilePatch): Promise<void> {
  const row: Row = {};
  for (const [field, value] of Object.entries(patch)) {
    const column = PROFILE_TO_COLUMN[field as keyof ProfilePatch];
    if (column !== undefined) row[column] = value;
  }
  if (Object.keys(row).length === 0) return;

  const { error } = await supabase.from('profiles').update(row).eq('id', uid);
  if (error) handleDbError(error, OperationType.UPDATE, `profiles/${uid}`);
}

// --------------------------------------------------------------- listings --

/**
 * Replicates Firestore's onSnapshot contract: emits the full listing array
 * immediately, then again after every insert/update/delete. The local map is
 * what makes "full array on every change" cheap — realtime events carry only
 * the changed row.
 */
export function subscribeToListings(
  uid: string,
  onData: (listings: ListingMetadata[]) => void,
  onError?: (err: unknown) => void,
): ListingsUnsubscribe {
  const byId = new Map<string, ListingMetadata>();
  let cancelled = false;

  const emit = () => onData([...byId.values()]);

  const fail = (err: unknown) => {
    if (onError) onError(err);
    else handleDbError(err, OperationType.LIST, `listings?user_id=${uid}`);
  };

  const channel = supabase
    .channel(`listings:${uid}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'listings', filter: `user_id=eq.${uid}` },
      payload => {
        if (cancelled) return;
        if (payload.eventType === 'DELETE') {
          const oldId = (payload.old as Row | null)?.id;
          if (typeof oldId === 'string') byId.delete(oldId);
        } else {
          const listing = rowToListing(payload.new as Row);
          byId.set(listing.id, listing);
        }
        emit();
      },
    )
    .subscribe();

  // Seed the map, then let realtime events keep it current.
  void (async () => {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (cancelled) return;
    if (error) {
      fail(error);
      return;
    }
    for (const row of data ?? []) {
      const listing = rowToListing(row as Row);
      byId.set(listing.id, listing);
    }
    emit();
  })();

  return () => {
    cancelled = true;
    void supabase.removeChannel(channel);
  };
}

export async function createListing(uid: string, input: NewListingInput): Promise<void> {
  const { error } = await supabase.from('listings').insert({
    user_id: uid,
    id: input.id,
    folder_name: input.folderName,
    project_id: input.projectId ?? null,
    project_name: input.projectName ?? null,
    status: input.status ?? 'idle',
    product_type: input.productType ?? null,
  });

  if (error) handleDbError(error, OperationType.WRITE, `listings/${input.id}`);
}

export async function updateListing(
  uid: string,
  listingId: string,
  patch: ListingPatch,
): Promise<void> {
  const row = listingToRow(patch as Record<string, unknown>);
  if (Object.keys(row).length === 0) return;

  const { error } = await supabase
    .from('listings')
    .update(row)
    .eq('user_id', uid)
    .eq('id', listingId);

  if (error) handleDbError(error, OperationType.UPDATE, `listings/${listingId}`);
}

/**
 * Releases listings orphaned mid-pipeline.
 *
 * The whole pipeline runs in the browser, so a refresh, a closed tab or a
 * crashed run leaves the row frozen in its in-flight status: the catch block
 * that would have reset it never executes. The UI then renders a permanently
 * disabled "Running AI..." button and the listing can never be retried.
 *
 * Anything untouched for longer than STALE_PIPELINE_MS has no live owner, so
 * it is returned to 'idle' and becomes runnable again.
 *
 * @returns the ids that were released
 */
export async function recoverStalledListings(uid: string): Promise<string[]> {
  const cutoff = new Date(Date.now() - STALE_PIPELINE_MS).toISOString();

  const { data, error } = await supabase
    .from('listings')
    .update({
      status: 'idle',
      pipeline_step_text: 'The previous run was interrupted before it finished. Press Run to try again.',
    })
    .eq('user_id', uid)
    .in('status', IN_FLIGHT_STATUSES as unknown as string[])
    .lt('updated_at', cutoff)
    .select('id');

  if (error) {
    // Never block sign-in over this — the manual reset is still available.
    console.error('Failed to recover stalled listings', error);
    return [];
  }
  return (data ?? []).map(row => row.id as string);
}

/** Manual escape hatch for a run the user can see is stuck. */
export async function resetListingToIdle(uid: string, listingId: string): Promise<void> {
  await updateListing(uid, listingId, {
    status: 'idle',
    pipelineStepText: 'Run cancelled. Press Run to start again.',
  });
}

export async function deleteListing(uid: string, listingId: string): Promise<void> {
  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('user_id', uid)
    .eq('id', listingId);

  if (error) handleDbError(error, OperationType.DELETE, `listings/${listingId}`);
}
