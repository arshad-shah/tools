import { parsePageRanges, rangesToIndices } from '@/pdf/edit';
import {
  MAX_CANVAS_PIXELS,
  type ImageFormat,
  type PageInfo,
} from '@/pdf/render';
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

/** Above this, the tool warns that the export may strain the browser. */
export const LARGE_EXPORT_BYTES = 500 * 1024 * 1024;

/**
 * Rough memory for holding every exported image (about half a byte per
 * pixel for PNG/JPEG of typical pages). Results stay in memory until
 * downloaded, and a ZIP briefly needs as much again.
 */
export function estimateExportBytes(
  pages: PageInfo[],
  indices: number[],
  dpi: number,
): number {
  const scale = dpi / 72;
  return indices.reduce((sum, i) => {
    const p = pages[i];
    if (!p) return sum;
    const px = Math.min(
      MAX_CANVAS_PIXELS,
      p.width * scale * (p.height * scale),
    );
    return sum + px / 2;
  }, 0);
}
