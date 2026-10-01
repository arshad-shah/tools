import { parsePageRanges, rangesToIndices } from '@/pdf/edit';
import type { ImageFormat } from '@/pdf/render';
import { deriveFilename } from '@/shared/lib/download';

export const IMAGE_MIME: Record<ImageFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
};

/** 0-based page indices, in document order. Blank = all pages. */
export function pagesToExport(text: string, pageCount: number): number[] {
  if (!text.trim()) return Array.from({ length: pageCount }, (_, i) => i);
  return [...new Set(rangesToIndices(parsePageRanges(text, pageCount)))].sort(
    (a, b) => a - b,
  );
}

export function imageFileName(
  source: string,
  pageIndex: number,
  pageCount: number,
  format: ImageFormat,
): string {
  const n = String(pageIndex + 1).padStart(String(pageCount).length, '0');
  return deriveFilename(source, `page-${n}`, format === 'png' ? 'png' : 'jpg');
}
