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
  /** Where the buyer downloads a listing Etsy will not carry the files for. */
  deliveryLink?: string | null;
  /**
   * The Google account whose Drive is connected, or null. A display value: the
   * grant itself is in public.drive_tokens, which no client role can read.
   */
  driveAccountEmail?: string | null;
  // Theme, Autopilot-vs-Guided, and the default fit mode. localStorage caches
  // these; this is the copy that counts.
  uiPrefs?: Record<string, unknown>;
}

export type ProfilePatch = Partial<
  Pick<UserProfile, 'etsyConnected' | 'etsyToken' | 'lastProductType' | 'savedTips' | 'plan' | 'uiPrefs' | 'deliveryLink'>
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
  // Not the Etsy access token. That moved to public.etsy_tokens, which no
  // client role can read, and is written only by the server. This column
  // survives because the demo connect path still stores the literal marker
  // 'DEMO_TOKEN' in it. Never put a real credential here.
  etsyToken: 'etsy_token',
  lastProductType: 'last_product_type',
  savedTips: 'saved_tips',
  uiPrefs: 'ui_prefs',
  plan: 'plan',
  deliveryLink: 'delivery_link',
  // drive_account_email is deliberately absent: the server writes it when the
  // grant is stored or removed, and a client must not be able to claim a
  // connection it does not have.
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
  printDelivery: 'print_delivery',
  // What the studio was set to for this listing: the templates picked by hand
  // and which source sits in which frame. It was session state, so any refresh
  // threw it away.
  studioPrefs: 'studio_prefs',
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
    deliveryLink: data.delivery_link ?? null,
    driveAccountEmail: data.drive_account_email ?? null,
    uiPrefs: (data.ui_prefs && typeof data.ui_prefs === 'object') ? data.ui_prefs : {},
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

/** The three fields worth being able to get back. */
const VERSIONED_FIELDS = ['title', 'description', 'tags'] as const;
type VersionedField = (typeof VERSIONED_FIELDS)[number];

export interface ListingRevision {
  id: number;
  listingId: string;
  field: VersionedField;
  previousValue: string | string[] | null;
  source: string | null;
  changedAt: string;
}

export async function updateListing(
  uid: string,
  listingId: string,
  patch: ListingPatch,
  source?: 'gemini' | 'manual',
): Promise<void> {
  const row = listingToRow(patch as Record<string, unknown>);
  if (Object.keys(row).length === 0) return;

  // Keep what the copy said before it is replaced. Re-running Gemini or
  // editing by hand used to overwrite the title, tags and description with no
  // way back to one that was better. Only these three, only when they are
  // actually being changed, and never at the cost of the write itself.
  const touched = VERSIONED_FIELDS.filter(field => field in patch);
  if (touched.length > 0) {
    await recordPreviousValues(uid, listingId, patch, touched, source).catch(error => {
      console.error('Could not record the previous copy', error);
    });
  }

  const { error } = await supabase
    .from('listings')
    .update(row)
    .eq('user_id', uid)
    .eq('id', listingId);

  if (error) handleDbError(error, OperationType.UPDATE, `listings/${listingId}`);
}

async function recordPreviousValues(
  uid: string,
  listingId: string,
  patch: ListingPatch,
  fields: VersionedField[],
  source?: string,
): Promise<void> {
  // A plain select: naming the columns from a runtime array defeats the
  // generated types, and the row is three text fields.
  const { data } = await supabase
    .from('listings')
    .select('title, description, tags')
    .eq('user_id', uid)
    .eq('id', listingId)
    .maybeSingle();
  if (!data) return;
  const current = data as unknown as Record<string, unknown>;

  const rows = fields
    .filter(field => {
      const before = current[field];
      const after = (patch as Record<string, unknown>)[field];
      // Nothing worth keeping if there was nothing there, or if the write is
      // saying the same thing again -- which the pipeline does often.
      if (before === null || before === undefined || before === '') return false;
      return JSON.stringify(before) !== JSON.stringify(after);
    })
    .map(field => ({
      user_id: uid,
      listing_id: listingId,
      field,
      previous_value: stringifyValue(current[field]),
      source: source ?? null,
    }));

  if (rows.length === 0) return;
  const { error } = await supabase.from('listing_revisions').insert(rows);
  if (error) throw error;
}

const stringifyValue = (value: unknown): string =>
  Array.isArray(value) ? JSON.stringify(value) : String(value);

/** What this listing's title, tags and description used to say, newest first. */
export async function listingRevisions(uid: string, listingId: string, limit = 40): Promise<ListingRevision[]> {
  const { data, error } = await supabase
    .from('listing_revisions')
    .select('*')
    .eq('user_id', uid)
    .eq('listing_id', listingId)
    .order('changed_at', { ascending: false })
    .limit(limit);
  if (error) handleDbError(error, OperationType.LIST, 'listing_revisions');

  return (data ?? []).map(row => {
    const stored = row.previous_value as string | null;
    return {
      id: row.id as number,
      listingId: row.listing_id as string,
      field: row.field as VersionedField,
      previousValue: row.field === 'tags' && stored ? safeParseTags(stored) : stored,
      source: (row.source as string) ?? null,
      changedAt: row.changed_at as string,
    };
  });
}

function safeParseTags(stored: string): string[] | string {
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : stored;
  } catch {
    return stored;
  }
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
 * It says where the run stopped. The old message -- "the previous run was
 * interrupted before it finished" -- was true of every case and useful in
 * none: a listing that died while writing copy and one that died before it
 * started read exactly alike, and the step it reached was overwritten in the
 * same statement that reported the failure.
 *
 * A re-run starts over rather than continuing, and that is now the cheap
 * option rather than a compromise. The reason given here previously -- that
 * mockups are regenerated on every run -- stopped being true when
 * lib/mockup-reuse.ts landed: a re-run reuses renders that already cover the
 * templates it wants. What is left to repeat is `scanning`, `thumbnail` and
 * `compiling`, which are three fixed 1.2s waits and no work, plus the copy
 * stage, which is the step that usually failed and the one worth repeating.
 *
 * So resuming mid-pipeline would save about 3.6 seconds of deliberate delay,
 * in exchange for a partial-progress state to persist and get wrong. Starting
 * over is the better trade while the intermediate stages stay this thin. If
 * they ever do real work, revisit it -- docs/persistence_plan.md phase 2.
 *
 * Note the one case this does not cover: `generateListingMockups` commits its
 * results in a single setState after the batch returns, so an interrupted run
 * leaves zero mockups rather than a partial set, and the reuse check is safe.
 * Renders that the server itself reported as failed are a different matter --
 * they leave a short set that later runs treat as complete.
 *
 * @returns the ids that were released
 */
const STEP_NAMES: Record<string, string> = {
  scanning: 'while reading the files',
  mockups: 'while rendering mockups',
  thumbnail: 'while preparing the thumbnail',
  compiling: 'while compiling the deliverables',
  seo: 'while writing the title, tags and description',
};

export async function recoverStalledListings(uid: string): Promise<string[]> {
  const cutoff = new Date(Date.now() - STALE_PIPELINE_MS).toISOString();

  // Read first, so the step each one reached is known before it is replaced.
  const { data: stalled, error: readError } = await supabase
    .from('listings')
    .select('id, status')
    .eq('user_id', uid)
    .in('status', IN_FLIGHT_STATUSES as unknown as string[])
    .lt('updated_at', cutoff);

  if (readError) {
    // Never block sign-in over this — the manual reset is still available.
    console.error('Failed to find stalled listings', readError);
    return [];
  }
  if (!stalled || stalled.length === 0) return [];

  const released: string[] = [];
  for (const row of stalled) {
    const where = STEP_NAMES[row.status as string] ?? 'partway through';
    const { error } = await supabase
      .from('listings')
      .update({
        status: 'idle',
        pipeline_step_text: `The previous run stopped ${where}. Press Run to start it again.`,
      })
      .eq('user_id', uid)
      .eq('id', row.id)
      // Only if nothing has touched it since it was read: a run that came back
      // to life in the meantime must not be reset out from under itself.
      .in('status', IN_FLIGHT_STATUSES as unknown as string[])
      .lt('updated_at', cutoff);
    if (error) {
      console.error('Failed to release stalled listing', row.id, error);
      continue;
    }
    released.push(row.id as string);
  }
  return released;
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
