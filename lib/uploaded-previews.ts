export interface UploadedPreview {
  id: string;
  label: string;
  image: string;
}

export function createUploadedPreviews(
  files: Array<{ name: string }>,
  imageUrls: string[],
): UploadedPreview[] {
  return files.flatMap((file, index) => {
    const image = imageUrls[index];
    return image ? [{ id: `upload-${index}`, label: file.name, image }] : [];
  });
}
