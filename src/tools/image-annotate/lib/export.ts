import { deriveFilename } from '@/shared/lib/download';
import { ToolError } from '@/shared/lib/errors';
import {
  canvasToBlob,
  createScratchCanvas,
  scratchContext2D,
} from '@/shared/surfaces/scratch-canvas';
import { docSize, type Doc } from './doc';
import { paintDoc } from './render';

export type ExportFormat = 'png' | 'jpeg' | 'webp';

export const EXPORT_MIME: Record<ExportFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

const EXT: Record<ExportFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
};

/** `photo.jpg` to `photo.annotated.png`. */
export const exportName = (source: string, format: ExportFormat) =>
  deriveFilename(source, 'annotated', EXT[format]);

/** Lossy formats take a quality. */
export const isLossy = (f: ExportFormat) => f !== 'png';

/**
 * The edited image at full resolution, encoded. Redactions are painted
 * into the pixels, so the file holds no trace of what they cover. JPEG
 * gets a white background (it has no transparency).
 */
export async function exportImage(
  image: CanvasImageSource,
  doc: Doc,
  format: ExportFormat,
  quality: number,
): Promise<Blob> {
  const { width, height } = docSize(doc);
  const canvas = createScratchCanvas(width, height);
  const ctx = scratchContext2D(canvas, { willReadFrequently: true });
  if (!ctx)
    throw new ToolError(
      'TOO_LARGE',
      `This browser cannot draw a ${width} by ${height} image`,
    );
  paintDoc(ctx, {
    image,
    doc,
    background: format === 'jpeg' ? '#ffffff' : null,
  });
  const mime = EXPORT_MIME[format];
  const blob = await canvasToBlob(
    canvas,
    mime,
    isLossy(format) ? quality : undefined,
  );
  if (!blob) throw new ToolError('UNKNOWN', 'Could not encode the image');
  if (blob.type !== mime)
    throw new ToolError(
      'UNSUPPORTED_FEATURE',
      `This browser cannot save ${format.toUpperCase()} images. Choose PNG.`,
    );
  return blob;
}
