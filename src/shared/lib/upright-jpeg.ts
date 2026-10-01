/**
 * Re-encodes a JPEG through the browser's decoder, which applies its EXIF
 * orientation, so the returned pixels are stored the way the photo is shown.
 * pdf-lib embeds JPEG bytes as-is (ignoring EXIF), so a sideways phone photo
 * would otherwise be drawn sideways and squashed into its upright-shaped box.
 */
export async function uprightJpeg(
  bytes: Uint8Array,
  quality = 0.92,
): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const bitmap = await createImageBitmap(
    new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'image/jpeg' }),
  );
  try {
    const { width, height } = bitmap;
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D canvas context');
    ctx.drawImage(bitmap, 0, 0);
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    return { bytes: new Uint8Array(await blob.arrayBuffer()), width, height };
  } finally {
    bitmap.close();
  }
}
