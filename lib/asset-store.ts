// Browser-local persistence (IndexedDB) for session assets so source images
// and rendered mockups survive a page refresh. Data is keyed per user + per
// listing folder; this is per-browser storage, not cloud sync.

const DB_NAME = 'autolister-assets';
const DB_VERSION = 1;
const SOURCES_STORE = 'sources';
const MOCKUPS_STORE = 'mockups';

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
}

export async function persistMockups(
  uid: string,
  folderName: string,
  mockups: StoredMockup[],
): Promise<void> {
  const db = await openAssetDb();
  try {
    const record: MockupsRecord = { key: recordKey(uid, folderName), uid, folderName, mockups };
    const tx = db.transaction(MOCKUPS_STORE, 'readwrite');
    await requestToPromise(tx.objectStore(MOCKUPS_STORE).put(record));
  } finally {
    db.close();
  }
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
}
