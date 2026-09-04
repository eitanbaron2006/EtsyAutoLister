// The fast local copy of the assets, in front of the buckets that hold them.
//
// This used to be the record: sources and mockups lived in IndexedDB and
// nowhere else, so a second machine, a private window, a cleared cache -- or a
// browser evicting storage under disk pressure, which it does without asking --
// lost the work outright.
//
// It is a cache now. Writes go here first because it is instant, and to the
// bucket behind it; reads come from here when it has the file and from the
// bucket when it does not. The API below is unchanged, so every call site keeps
// working: what changed is that losing this store now costs a download rather
// than the files.

import {
  downloadAsset,
  listAssets,
  removeListingAssets,
  uploadAsset,
  type AssetRecord,
} from '@/lib/asset-cloud';

const DB_NAME = 'autolister-assets';
const DB_VERSION = 2;
const SOURCES_STORE = 'sources';
const MOCKUPS_STORE = 'mockups';
const STAGING_STORE = 'staging';

export interface StoredMockup {
  id: string;
  templateId: string;
  sourceFileNames: string[];
  frameAssignment?: string[];
  fileName: string;
  fileType: string;
  blob: Blob;
}

interface SourcesRecord {
  key: string; // `${uid}:${folderName}`
  uid: string;
  folderName: string;
  images: { name: string; type: string; blob: Blob }[];
  files: { name: string; type: string; blob: Blob }[];
}

interface MockupsRecord {
  key: string;
  uid: string;
  folderName: string;
  mockups: StoredMockup[];
}

function openAssetDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable in this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SOURCES_STORE)) {
        db.createObjectStore(SOURCES_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(MOCKUPS_STORE)) {
        db.createObjectStore(MOCKUPS_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STAGING_STORE)) {
        db.createObjectStore(STAGING_STORE, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open asset DB'));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Asset DB request failed'));
  });
}

const recordKey = (uid: string, folderName: string) => `${uid}:${folderName}`;

export async function persistSources(
  uid: string,
  folderName: string,
  images: File[],
  files: File[],
  listingId?: string,
): Promise<void> {
  const db = await openAssetDb();
  try {
    const record: SourcesRecord = {
      key: recordKey(uid, folderName),
      uid,
      folderName,
      images: images.map(f => ({ name: f.name, type: f.type, blob: f })),
      files: files.map(f => ({ name: f.name, type: f.type, blob: f })),
    };
    const tx = db.transaction(SOURCES_STORE, 'readwrite');
    await requestToPromise(tx.objectStore(SOURCES_STORE).put(record));
  } finally {
    db.close();
  }

  // The cache is written first because it is instant and the screen is waiting
  // on it. The upload follows; it is what makes the files survive this browser.
  await uploadAll(uid, folderName, listingId ?? folderName, [
    ...images.map(file => ({ file, kind: 'source' as const })),
    ...files.map(file => ({ file, kind: 'source' as const })),
  ]);
}

/** Send a batch to the bucket, and say what could not go. */
async function uploadAll(
  uid: string,
  folderName: string,
  listingId: string,
  items: { file: File | Blob; kind: 'source' | 'mockup'; fileName?: string; templateId?: string; sourceFiles?: string[] }[],
): Promise<void> {
  const failures: string[] = [];
  for (const item of items) {
    const fileName = item.fileName ?? (item.file instanceof File ? item.file.name : 'asset');
    try {
      await uploadAsset(uid, {
        listingId,
        folderName,
        kind: item.kind,
        file: item.file,
        fileName,
        templateId: item.templateId,
        sourceFiles: item.sourceFiles,
      });
    } catch {
      failures.push(fileName);
    }
  }
  if (failures.length > 0) {
    // Not thrown: the local copy is already saved and the session can carry on.
    // What is lost is durability, and that is worth saying rather than hiding.
    console.warn(`${failures.length} asset(s) stayed local only: ${failures.slice(0, 5).join(', ')}`);
  }
}

export async function persistMockups(
  uid: string,
  folderName: string,
  mockups: StoredMockup[],
  listingId?: string,
): Promise<void> {
  const db = await openAssetDb();
  try {
    const record: MockupsRecord = { key: recordKey(uid, folderName), uid, folderName, mockups };
    const tx = db.transaction(MOCKUPS_STORE, 'readwrite');
    await requestToPromise(tx.objectStore(MOCKUPS_STORE).put(record));
  } finally {
    db.close();
  }

  await uploadAll(
    uid,
    folderName,
    listingId ?? folderName,
    mockups.map(mockup => ({
      file: mockup.blob,
      kind: 'mockup' as const,
      fileName: mockup.fileName,
      // Which template made this file, and what went into it. The schema could
      // never answer that before -- it held one thumbnail and nothing else.
      templateId: mockup.templateId,
      sourceFiles: mockup.sourceFileNames,
    })),
  );
}

export async function loadAllSources(uid: string): Promise<Record<string, { images: File[]; files: File[] }>> {
  const db = await openAssetDb();
  try {
    const tx = db.transaction(SOURCES_STORE, 'readonly');
    const records = await requestToPromise(tx.objectStore(SOURCES_STORE).getAll()) as SourcesRecord[];
    const result: Record<string, { images: File[]; files: File[] }> = {};
    for (const record of records) {
      if (record.uid !== uid) continue;
      result[record.folderName] = {
        images: record.images.map(item => new File([item.blob], item.name, { type: item.type })),
        files: record.files.map(item => new File([item.blob], item.name, { type: item.type })),
      };
    }
    return result;
  } finally {
    db.close();
  }
}

export async function loadAllMockups(uid: string): Promise<Record<string, StoredMockup[]>> {
  const db = await openAssetDb();
  try {
    const tx = db.transaction(MOCKUPS_STORE, 'readonly');
    const records = await requestToPromise(tx.objectStore(MOCKUPS_STORE).getAll()) as MockupsRecord[];
    const result: Record<string, StoredMockup[]> = {};
    for (const record of records) {
      if (record.uid !== uid) continue;
      result[record.folderName] = record.mockups;
    }
    return result;
  } finally {
    db.close();
  }
}

export async function deleteListingAssets(uid: string, folderName: string): Promise<void> {
  const db = await openAssetDb();
  try {
    const key = recordKey(uid, folderName);
    const tx = db.transaction([SOURCES_STORE, MOCKUPS_STORE], 'readwrite');
    await Promise.all([
      requestToPromise(tx.objectStore(SOURCES_STORE).delete(key)),
      requestToPromise(tx.objectStore(MOCKUPS_STORE).delete(key)),
    ]);
  } finally {
    db.close();
  }

  // Both copies, or the next sign-in downloads back what was just deleted.
  await removeListingAssets(uid, folderName).catch(() => {
    console.warn('Stored assets for', folderName, 'could not be removed from the bucket');
  });
}

/* ------------------------------------------------------------ filling in --
   What the bucket has and this browser does not. */

/** Rebuild a File from a stored record, so callers cannot tell the difference. */
async function fetchIntoFile(record: AssetRecord): Promise<File | null> {
  const blob = await downloadAsset(record);
  if (!blob) return null;
  return new File([blob], record.fileName, { type: record.contentType || blob.type || 'application/octet-stream' });
}

export interface SyncOutcome {
  folders: string[];
  files: number;
  missing: number;
}

/**
 * Bring down whatever this browser is missing.
 *
 * Called once after the local load: a machine that has the files reads them
 * instantly and downloads nothing, and a machine that has never seen them ends
 * up with the same session rather than an error saying the assets are gone.
 */
export async function syncFromCloud(uid: string): Promise<SyncOutcome> {
  const outcome: SyncOutcome = { folders: [], files: 0, missing: 0 };
  let stored: AssetRecord[];
  try {
    stored = await listAssets(uid);
  } catch {
    // Offline, or the table is not there yet. The local copy still works.
    return outcome;
  }
  if (stored.length === 0) return outcome;

  const [localSources, localMockups] = await Promise.all([loadAllSources(uid), loadAllMockups(uid)]);

  const byFolder = new Map<string, AssetRecord[]>();
  for (const record of stored) {
    byFolder.set(record.folderName, [...(byFolder.get(record.folderName) ?? []), record]);
  }

  for (const [folderName, records] of byFolder) {
    const haveSources = new Set((localSources[folderName]?.images ?? []).map(file => file.name)
      .concat((localSources[folderName]?.files ?? []).map(file => file.name)));
    const haveMockups = new Set((localMockups[folderName] ?? []).map(mockup => mockup.fileName));

    const wantedSources = records.filter(r => r.kind !== 'mockup' && !haveSources.has(r.fileName));
    const wantedMockups = records.filter(r => r.kind === 'mockup' && !haveMockups.has(r.fileName));
    if (wantedSources.length === 0 && wantedMockups.length === 0) continue;

    const images = [...(localSources[folderName]?.images ?? [])];
    const files = [...(localSources[folderName]?.files ?? [])];
    for (const record of wantedSources) {
      const file = await fetchIntoFile(record);
      if (!file) { outcome.missing += 1; continue; }
      (isImageName(record.fileName) ? images : files).push(file);
      outcome.files += 1;
    }

    const mockups = [...(localMockups[folderName] ?? [])];
    for (const record of wantedMockups) {
      const blob = await downloadAsset(record);
      if (!blob) { outcome.missing += 1; continue; }
      mockups.push({
        id: record.id,
        templateId: record.templateId ?? '',
        sourceFileNames: record.sourceFiles,
        fileName: record.fileName,
        fileType: record.contentType || blob.type || 'image/jpeg',
        blob,
      });
      outcome.files += 1;
    }

    // Written straight to IndexedDB: uploading these back where they came from
    // would be work for nothing.
    await Promise.all([
      writeSourcesRecord(uid, folderName, images, files),
      writeMockupsRecord(uid, folderName, mockups),
    ]);
    outcome.folders.push(folderName);
  }

  return outcome;
}

const isImageName = (name: string) => /\.(png|jpe?g|webp|avif|gif|bmp|tiff?)$/i.test(name);

async function writeSourcesRecord(uid: string, folderName: string, images: File[], files: File[]): Promise<void> {
  const db = await openAssetDb();
  try {
    const record: SourcesRecord = {
      key: recordKey(uid, folderName),
      uid,
      folderName,
      images: images.map(f => ({ name: f.name, type: f.type, blob: f })),
      files: files.map(f => ({ name: f.name, type: f.type, blob: f })),
    };
    const tx = db.transaction(SOURCES_STORE, 'readwrite');
    await requestToPromise(tx.objectStore(SOURCES_STORE).put(record));
  } finally {
    db.close();
  }
}

async function writeMockupsRecord(uid: string, folderName: string, mockups: StoredMockup[]): Promise<void> {
  const db = await openAssetDb();
  try {
    const record: MockupsRecord = { key: recordKey(uid, folderName), uid, folderName, mockups };
    const tx = db.transaction(MOCKUPS_STORE, 'readwrite');
    await requestToPromise(tx.objectStore(MOCKUPS_STORE).put(record));
  } finally {
    db.close();
  }
}

/* --------------------------------------------------------- the staging tray

   Files chosen, sets merged, groups split, names typed -- all of it before
   "Create Listings" writes anything anywhere. It was React state, so a refresh
   at that moment threw the lot away.

   It goes here rather than into sessionStorage for the plain reason that it
   holds File objects, and sessionStorage holds strings. It also does not go to
   the bucket: this is work in progress that has no listing to belong to yet,
   and uploading files the user may be about to discard would be the wrong
   trade. One tab, one refresh, one recovery. */

interface StagedFile {
  name: string;
  type: string;
  blob: Blob;
}

interface StagingRecord {
  key: string; // the uid on its own: one tray per person
  savedAt: number;
  products: {
    id: string;
    name: string;
    kind: 'single' | 'set';
    images: (StagedFile & { id: string })[];
    files: StagedFile[];
  }[];
}

export interface StagedProductInput {
  id: string;
  name: string;
  kind: 'single' | 'set';
  images: { id: string; file: File }[];
  files: File[];
}

export interface RestoredStagedProduct {
  id: string;
  name: string;
  kind: 'single' | 'set';
  images: { id: string; file: File; url: string }[];
  files: File[];
}

/** How long an abandoned tray is worth offering back. */
export const STAGING_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export async function saveStagingTray(uid: string, products: StagedProductInput[]): Promise<void> {
  const db = await openAssetDb();
  try {
    const record: StagingRecord = {
      key: uid,
      savedAt: Date.now(),
      products: products.map(product => ({
        id: product.id,
        name: product.name,
        kind: product.kind,
        images: product.images.map(image => ({
          id: image.id,
          name: image.file.name,
          type: image.file.type,
          blob: image.file,
        })),
        files: product.files.map(file => ({ name: file.name, type: file.type, blob: file })),
      })),
    };
    const tx = db.transaction(STAGING_STORE, 'readwrite');
    await requestToPromise(tx.objectStore(STAGING_STORE).put(record));
  } finally {
    db.close();
  }
}

/**
 * The tray as it was left, with fresh object URLs.
 *
 * The URLs are not stored: an object URL belongs to the document that made it
 * and means nothing after a reload.
 */
export async function loadStagingTray(uid: string): Promise<RestoredStagedProduct[]> {
  const db = await openAssetDb();
  try {
    const tx = db.transaction(STAGING_STORE, 'readonly');
    const record = await requestToPromise(tx.objectStore(STAGING_STORE).get(uid)) as StagingRecord | undefined;
    if (!record) return [];
    if (Date.now() - record.savedAt > STAGING_MAX_AGE_MS) return [];
    return record.products.map(product => ({
      id: product.id,
      name: product.name,
      kind: product.kind,
      images: product.images.map(image => {
        const file = new File([image.blob], image.name, { type: image.type });
        return { id: image.id, file, url: URL.createObjectURL(file) };
      }),
      files: product.files.map(file => new File([file.blob], file.name, { type: file.type })),
    }));
  } catch {
    return [];
  } finally {
    db.close();
  }
}

export async function clearStagingTray(uid: string): Promise<void> {
  const db = await openAssetDb();
  try {
    const tx = db.transaction(STAGING_STORE, 'readwrite');
    await requestToPromise(tx.objectStore(STAGING_STORE).delete(uid));
  } catch {
    // Nothing to clear is the same outcome as clearing it.
  } finally {
    db.close();
  }
}

/**
 * Send up whatever this browser has and the bucket does not.
 *
 * Everything stored before the buckets existed is in IndexedDB and nowhere
 * else. Without this the change protects new uploads only, and the listings
 * that already exist -- the ones with real work in them -- stay exactly as
 * fragile as they were.
 *
 * It runs once per sign-in, after the download pass, and compares by file
 * name, so a second sign-in sends nothing. Slow and in the background on
 * purpose: this is catching up, not something anyone is waiting for.
 */
export async function backfillToCloud(uid: string): Promise<{ uploaded: number; folders: number }> {
  const outcome = { uploaded: 0, folders: 0 };

  let recorded: AssetRecord[];
  try {
    recorded = await listAssets(uid);
  } catch {
    return outcome; // Offline. There will be another sign-in.
  }

  const [localSources, localMockups] = await Promise.all([loadAllSources(uid), loadAllMockups(uid)]);
  const alreadyUp = new Map<string, Set<string>>();
  for (const record of recorded) {
    const names = alreadyUp.get(record.folderName) ?? new Set<string>();
    names.add(record.fileName);
    alreadyUp.set(record.folderName, names);
  }

  const folders = new Set([...Object.keys(localSources), ...Object.keys(localMockups)]);
  for (const folderName of folders) {
    const up = alreadyUp.get(folderName) ?? new Set<string>();
    const sources = localSources[folderName];
    const missingSources = [
      ...(sources?.images ?? []),
      ...(sources?.files ?? []),
    ].filter(file => !up.has(file.name));
    const missingMockups = (localMockups[folderName] ?? []).filter(mockup => !up.has(mockup.fileName));
    if (missingSources.length === 0 && missingMockups.length === 0) continue;

    let sent = 0;
    for (const file of missingSources) {
      try {
        await uploadAsset(uid, {
          listingId: folderName,
          folderName,
          kind: 'source',
          file,
          fileName: file.name,
        });
        sent += 1;
      } catch {
        // One file that will not go is not a reason to abandon the rest.
      }
    }
    for (const mockup of missingMockups) {
      try {
        await uploadAsset(uid, {
          listingId: folderName,
          folderName,
          kind: 'mockup',
          file: mockup.blob,
          fileName: mockup.fileName,
          templateId: mockup.templateId,
          sourceFiles: mockup.sourceFileNames,
        });
        sent += 1;
      } catch {
        // As above.
      }
    }
    if (sent > 0) {
      outcome.uploaded += sent;
      outcome.folders += 1;
    }
  }

  return outcome;
}
