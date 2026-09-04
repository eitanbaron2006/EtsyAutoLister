// Where an asset sits in its bucket. Pure string work, deliberately apart from
// anything that talks to Supabase: a folder name is user-supplied text, and
// what it turns into is the whole access rule.

export type AssetKind = 'source' | 'mockup' | 'delivery';
export type AssetBucket = 'sources' | 'mockups';

export const bucketFor = (kind: AssetKind): AssetBucket => (kind === 'mockup' ? 'mockups' : 'sources');

/** One path segment that a bucket, and a person reading it, can both live with. */
export function safeSegment(value: string): string {
  const cleaned = value
    .normalize('NFKD')
    // NFKD splits an accented letter into the letter and a combining mark.
    // Dropping the mark keeps "Cafe"; treating it as punctuation gave "Cafe-".
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.\- ]+/g, '-')
    .replace(/\s+/g, '_')
    .replace(/-{2,}/g, '-')
    .replace(/^[-._]+|[-.]+$/g, '')
    .slice(0, 120);
  return cleaned || 'unnamed';
}

/**
 * The uid comes first because the storage policy is that first segment and
 * nothing else. The rest is readable on purpose: someone looking into the
 * bucket should be able to tell what they are looking at without a join.
 */
export function storagePathFor(uid: string, folderName: string, kind: AssetKind, fileName: string): string {
  return [uid, safeSegment(folderName), kind, safeSegment(fileName)].join('/');
}

export const isImageName = (name: string) => /\.(png|jpe?g|webp|avif|gif|bmp|tiff?)$/i.test(name);
