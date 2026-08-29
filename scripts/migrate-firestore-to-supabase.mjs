// One-time data migration: Firestore -> local Supabase.
//
// Reads users/{uid} and users/{uid}/listings/{id} from the Firebase project
// with admin credentials (bypassing firestore.rules), then inserts them into
// Postgres with the service-role key (bypassing RLS).
//
// Prerequisites:
//   1. gcloud auth application-default login   <- as the project owner
//   2. npx supabase start
//
// Usage:
//   node scripts/migrate-firestore-to-supabase.mjs [--dry-run]
//
// Idempotent: re-running upserts the same rows rather than duplicating them.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const DRY_RUN = process.argv.includes('--dry-run');

const FIREBASE_PROJECT = 'gen-lang-client-0066141798';
const FIRESTORE_DB = 'ai-studio-076899c4-42f6-43e0-a3a0-cb6b2d35dfbc';

/**
 * Reads a key from .env.local. Credentials are never inlined here — the file
 * is gitignored, this script is not.
 */
function fromEnvLocal(key) {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return undefined;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (m && m[1] === key) return m[2].trim().replace(/^["']|["']$/g, '');
  }
  return undefined;
}

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || fromEnvLocal('NEXT_PUBLIC_SUPABASE_URL') || 'http://127.0.0.1:57321';
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || fromEnvLocal('SUPABASE_SECRET_KEY');

if (!SERVICE_KEY) {
  console.error(
    'Missing SUPABASE_SECRET_KEY.\n' +
    'Set it in .env.local (npx supabase start prints it), or export it before running.',
  );
  process.exit(1);
}

// ------------------------------------------------------------ credentials --

function adcPath() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const appData = process.env.APPDATA;
  if (appData) return path.join(appData, 'gcloud', 'application_default_credentials.json');
  return path.join(os.homedir(), '.config', 'gcloud', 'application_default_credentials.json');
}

async function accessToken() {
  const file = adcPath();
  if (!fs.existsSync(file)) {
    throw new Error(
      `No application-default credentials at ${file}.\n` +
      `Run:  gcloud auth application-default login`,
    );
  }
  const cred = JSON.parse(fs.readFileSync(file, 'utf8'));

  if (cred.type === 'service_account') {
    throw new Error('Service-account keys are not handled here; use ADC user credentials.');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cred.client_id,
      client_secret: cred.client_secret,
      refresh_token: cred.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

// -------------------------------------------------------- firestore reads --

const BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/${FIRESTORE_DB}/documents`;

/** Firestore's typed value wrapper -> a plain JS value. */
function decode(value) {
  if (value == null) return null;
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decode);
  if ('mapValue' in value) return decodeFields(value.mapValue.fields || {});
  if ('bytesValue' in value) return value.bytesValue;
  if ('referenceValue' in value) return value.referenceValue;
  return null;
}

function decodeFields(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) out[k] = decode(v);
  return out;
}

async function listDocs(token, collectionPath) {
  const docs = [];
  let pageToken = '';
  do {
    const url = `${BASE}/${collectionPath}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 404) return docs;               // collection does not exist
    if (!res.ok) throw new Error(`Firestore ${collectionPath}: ${res.status} ${await res.text()}`);
    const body = await res.json();
    for (const d of body.documents || []) {
      docs.push({ id: d.name.split('/').pop(), data: decodeFields(d.fields || {}), createTime: d.createTime });
    }
    pageToken = body.nextPageToken || '';
  } while (pageToken);
  return docs;
}

// ------------------------------------------------------------- supabase io --

async function sb(pathname, init = {}) {
  const res = await fetch(`${SUPABASE_URL}${pathname}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${pathname}: ${res.status} ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}

// Same field map as lib/listings-repo.ts — `listingId` becomes
// `etsy_listing_id` because `id` is our own primary key.
const LISTING_TO_COLUMN = {
  id: 'id',
  folderName: 'folder_name',
  projectId: 'project_id',
  projectName: 'project_name',
  title: 'title',
  description: 'description',
  price: 'price',
  tags: 'tags',
  status: 'status',
  listingId: 'etsy_listing_id',
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

const VALID_STATUS = new Set([
  'idle', 'scanning', 'mockups', 'thumbnail', 'compiling',
  'seo', 'ready', 'publishing', 'published',
]);

function toRow(listing, supabaseUserId, docId, createTime) {
  const row = { user_id: supabaseUserId, id: docId };
  for (const [field, value] of Object.entries(listing)) {
    const column = LISTING_TO_COLUMN[field];
    if (!column || value === null || value === undefined) continue;
    row[column] = value;
  }
  row.id = docId;                                   // doc id always wins
  if (!row.folder_name) row.folder_name = docId;    // NOT NULL in the schema
  if (!VALID_STATUS.has(row.status)) row.status = 'idle';
  if (Array.isArray(row.tags)) row.tags = row.tags.filter(t => typeof t === 'string').slice(0, 13);
  if (createTime) row.created_at = createTime;
  return row;
}

// ------------------------------------------------------------------- main --

async function main() {
  console.log(`Firestore : ${FIREBASE_PROJECT} / ${FIRESTORE_DB}`);
  console.log(`Supabase  : ${SUPABASE_URL}`);
  console.log(DRY_RUN ? 'MODE      : dry run (nothing is written)\n' : 'MODE      : writing\n');

  const token = await accessToken();

  // Map Supabase accounts by email so Firebase UIDs can be translated.
  const users = await sb('/auth/v1/admin/users?per_page=200', {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  const byEmail = new Map(
    (users.users || users || []).map(u => [String(u.email || '').toLowerCase(), u.id]),
  );
  console.log(`Supabase accounts: ${byEmail.size}`);

  const fsUsers = await listDocs(token, 'users');
  console.log(`Firestore user docs: ${fsUsers.length}\n`);

  let profilesUpdated = 0, listingsInserted = 0, skipped = 0;

  for (const u of fsUsers) {
    const email = String(u.data.email || '').toLowerCase();
    const supabaseId = byEmail.get(email);

    if (!supabaseId) {
      console.log(`  SKIP  ${email || u.id} — no matching Supabase account`);
      skipped++;
      continue;
    }

    const listings = await listDocs(token, `users/${u.id}/listings`);
    console.log(`  ${email}: ${listings.length} listing(s)`);

    if (!DRY_RUN) {
      const patch = {};
      if (typeof u.data.etsyConnected === 'boolean') patch.etsy_connected = u.data.etsyConnected;
      if (u.data.etsyToken) patch.etsy_token = u.data.etsyToken;
      if (u.data.lastProductType) patch.last_product_type = u.data.lastProductType;
      if (Array.isArray(u.data.savedTips)) patch.saved_tips = u.data.savedTips.filter(t => typeof t === 'string');
      if (u.data.plan) patch.plan = u.data.plan;
      if (Object.keys(patch).length) {
        await sb(`/rest/v1/profiles?id=eq.${supabaseId}`, {
          method: 'PATCH', body: JSON.stringify(patch),
        });
        profilesUpdated++;
      }
    }

    for (const l of listings) {
      const row = toRow(l.data, supabaseId, l.id, l.createTime);
      if (DRY_RUN) {
        console.log(`      would insert ${row.id} (${row.status})`);
      } else {
        await sb('/rest/v1/listings', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(row),
        });
      }
      listingsInserted++;
    }
  }

  console.log(`\nprofiles updated : ${profilesUpdated}`);
  console.log(`listings migrated: ${listingsInserted}`);
  console.log(`users skipped    : ${skipped}`);
}

main().catch(err => {
  console.error(`\nFAILED: ${err.message}`);
  process.exit(1);
});
