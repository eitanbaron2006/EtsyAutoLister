export type MockupVariantId = 'hero' | 'detail' | 'store-cover';

export interface MockupGalleryItem {
  id: MockupVariantId;
  label: string;
  image: string;
}

export const MOCKUP_VARIANTS: Array<{ id: MockupVariantId; label: string }> = [
  { id: 'hero', label: 'Hero' },
  { id: 'detail', label: 'Detail' },
  { id: 'store-cover', label: 'Store Cover' },
];

export function createMockupGallery(images: string[]): MockupGalleryItem[] {
  return MOCKUP_VARIANTS.flatMap((variant, index) => {
    const image = images[index];
    return image ? [{ ...variant, image }] : [];
  });
}

export function getReviewMockups(
  gallery: MockupGalleryItem[] | undefined,
  legacyImage: string | undefined,
): MockupGalleryItem[] {
  const saved = (gallery || []).filter((item) => Boolean(item.image));
  if (saved.length > 0) {
    return saved;
  }

  return legacyImage ? [{ id: 'hero', label: 'Hero', image: legacyImage }] : [];
}
