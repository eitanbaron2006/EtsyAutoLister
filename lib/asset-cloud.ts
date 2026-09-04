// The copy of every asset that is not in this browser.
//
// Sources and mockups used to exist only in IndexedDB, which made the browser
// the record. A second machine, a private window, a cleared cache -- or a
// browser evicting storage under disk pressure, which it does without asking --
// lost the work, and the only thing the app could do was say so.
//
// Two private buckets hold them now. `listing_assets` says what is in there:
// without that row a bucket is the same anonymous folder the browser was, and
// nothing can be answered for, re-downloaded or cleaned up.
//
// Nothing outside this file talks to Supabase Storage.

import { supabase, handleDbError, OperationType } from '@/lib/supabase';
import { bucketFor, storagePathFor, type AssetBucket, type AssetKind } from '@/lib/asset-paths';

export type { AssetBucket, AssetKind } from '@/lib/asset-paths';
export { safeSegment, storagePathFor } from '@/lib/asset-paths';

export interface AssetRecord {
  id: string;
  listingId: string;
  folderName: string;
  kind: AssetKind;
  bucket: AssetBucket;
  storagePath: string;
  fileName: string;
  contentType: string | null;
  bytes: number;
  templateId: string | null;
  sourceFiles: string[];
}

export interface UploadRequest {
  listingId: string;
  folderName: string;
  kind: AssetKind;
  file: Blob;
  fileName: string;
  templateId?: string;
  sourceFiles?: string[];
}

function rowToRecord(row: Record<string, unknown>): AssetRecord {
  return {
    id: String(row.id),
    listingId: String(row.listing_id ?? ''),
    folderName: String(row.folder_name ?? ''),
    kind: row.kind as AssetKind,
    bucket: row.bucket as AssetBucket,
    storagePath: String(row.storage_path ?? ''),
    fileName: String(row.file_name ?? ''),
    contentType: (row.content_type as string) ?? null,
    bytes: Number(row.bytes ?? 0),
    templateId: (row.template_id as string) ?? null,
    sourceFiles: (row.source_files as string[]) ?? [],
  };
}

/**
 * Put one file in its bucket and record that it is there.
 *
 * Upserting on both halves: re-running a listing writes the same paths again,
 * and the second run should replace the first rather than fail or duplicate.
 */
export async function uploadAsset(uid: string, request: UploadRequest): Promise<AssetRecord> {
  const bucket = bucketFor(request.kind);
  const storagePath = storagePathFor(uid, request.folderName, request.kind, request.fileName);

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, request.file, {
      upsert: true,
      contentType: request.file.type || 'application/octet-stream',
    });
  if (uploadError) handleDbError(uploadError, OperationType.WRITE, `${bucket}/${storagePath}`);

  const { data, error } = await supabase
    .from('listing_assets')
    .upsert(
      {
        user_id: uid,
        listing_id: request.listingId,
        folder_name: request.folderName,
        kind: request.kind,
        bucket,
        storage_path: storagePath,
        file_name: request.fileName,
        content_type: request.file.type || null,
        bytes: request.file.size,
        template_id: request.templateId ?? null,
        source_files: request.sourceFiles ?? [],
      },
      { onConflict: 'user_id,bucket,storage_path' },
    )
    .select()
    .single();
  if (error) handleDbError(error, OperationType.WRITE, 'listing_assets');

  return rowToRecord(data as Record<string, unknown>);
}

/** Everything this user has stored, newest folder work first. */
export async function listAssets(uid: string, folderName?: string): Promise<AssetRecord[]> {
  let query = supabase.from('listing_assets').select('*').eq('user_id', uid);
  if (folderName) query = query.eq('folder_name', folderName);

  const { data, error } = await query.order('created_at', { ascending: true });
  if (error) handleDbError(error, OperationType.LIST, 'listing_assets');
  return (data ?? []).map(row => rowToRecord(row as Record<string, unknown>));
}

/** The bytes behind one record, or null if the object is no longer there. */
export async function downloadAsset(record: AssetRecord): Promise<Blob | null> {
  const { data, error } = await supabase.storage.from(record.bucket).download(record.storagePath);
  if (error) {
    // A missing object is a fact to work around, not a reason to stop: the
    // caller still has the rest of the listing.
    console.warn('Asset missing from storage', record.storagePath, error.message);
    return null;
  }
  return data;
}

/** Forget one listing's assets: the objects first, then the rows. */
export async function removeListingAssets(uid: string, folderName: string): Promise<number> {
  const records = await listAssets(uid, folderName);
  if (records.length === 0) return 0;

  for (const bucket of ['sources', 'mockups'] as AssetBucket[]) {
    const paths = records.filter(record => record.bucket === bucket).map(record => record.storagePath);
    if (paths.length === 0) continue;
    const { error } = await supabase.storage.from(bucket).remove(paths);
    // A failed remove leaves an orphan object, which the row cleanup below
    // would then hide for good -- so it is worth saying out loud.
    if (error) console.warn('Could not remove stored objects', bucket, error.message);
  }

  const { error } = await supabase
    .from('listing_assets')
    .delete()
    .eq('user_id', uid)
    .eq('folder_name', folderName);
  if (error) handleDbError(error, OperationType.DELETE, 'listing_assets');
  return records.length;
}

/**
 * How much room the browser is giving this origin, and how much is used.
 *
 * Worth knowing because IndexedDB is evicted silently: nothing warns, nothing
 * throws, and the first sign is a listing that cannot publish. Now that the
 * bucket holds the record, eviction is survivable -- but it is still the
 * difference between a fast session and one that re-downloads everything.
 */
export async function browserStorageUse(): Promise<{ usedBytes: number; quotaBytes: number; durable: boolean }> {
  const fallback = { usedBytes: 0, quotaBytes: 0, durable: false };
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return fallback;
  try {
    const estimate = await navigator.storage.estimate();
    const durable = navigator.storage.persisted ? await navigator.storage.persisted() : false;
    return { usedBytes: estimate.usage ?? 0, quotaBytes: estimate.quota ?? 0, durable };
  } catch {
    return fallback;
  }
}

/** Ask the browser to stop evicting this origin's storage. Best effort. */
export async function askForDurableStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
