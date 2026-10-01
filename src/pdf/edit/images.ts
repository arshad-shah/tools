import { PDFDocument, type PDFImage } from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';

export const PAGE_SIZES = {
  a4: [595.28, 841.89] as [number, number],
  letter: [612, 792] as [number, number],
};
/** Fit-to-image pages treat image pixels as CSS pixels (96 DPI). */
export const PX_TO_PT = 0.75;

export type PageSizeName = 'a4' | 'letter' | 'fit';
export type Orientation = 'auto' | 'portrait' | 'landscape';

export interface ImagesToPdfOptions {
  pageSize: PageSizeName;
  /** Ignored for `fit`. */
  orientation: Orientation;
  marginPt: number;
}

export interface ImagePageLayout {
  pageWidth: number;
  pageHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageInput {
  bytes: Uint8Array;
  kind: 'png' | 'jpeg';
  name: string;
}

export function layoutImagePage(
  imgW: number,
  imgH: number,
  opts: ImagesToPdfOptions,
): ImagePageLayout {
  if (!Number.isFinite(opts.marginPt)) {
    throw new ToolError('INVALID_INPUT', 'Enter a margin in millimetres');
  }
  const m = Math.max(0, opts.marginPt);
  if (opts.pageSize === 'fit') {
    const width = imgW * PX_TO_PT;
    const height = imgH * PX_TO_PT;
    return {
      pageWidth: width + 2 * m,
      pageHeight: height + 2 * m,
      x: m,
      y: m,
      width,
      height,
    };
  }
  let [pw, ph] = PAGE_SIZES[opts.pageSize];
  const landscape =
    opts.orientation === 'landscape' ||
    (opts.orientation === 'auto' && imgW > imgH);
  if (landscape) [pw, ph] = [ph, pw];
  const boxW = pw - 2 * m;
  const boxH = ph - 2 * m;
  if (boxW <= 0 || boxH <= 0) {
    throw new ToolError(
      'INVALID_INPUT',
      'The margin is too large for this page size',
    );
  }
  const s = Math.min(boxW / imgW, boxH / imgH);
  const width = imgW * s;
  const height = imgH * s;
  return {
    pageWidth: pw,
    pageHeight: ph,
    x: (pw - width) / 2,
    y: (ph - height) / 2,
    width,
    height,
  };
}

/** PNG and JPEG are embedded natively (PNG alpha becomes an SMask). */
export async function imagesToPdf(
  images: ImageInput[],
  opts: ImagesToPdfOptions,
): Promise<Uint8Array> {
  if (images.length === 0)
    throw new ToolError('INVALID_INPUT', 'Add at least one image');
  const doc = await PDFDocument.create();
  for (const img of images) {
    let embedded: PDFImage;
    try {
      embedded =
        img.kind === 'png'
          ? await doc.embedPng(img.bytes)
          : await doc.embedJpg(img.bytes);
    } catch (cause) {
      throw new ToolError(
        'INVALID_FILE',
        `${img.name} could not be read as an image`,
        { cause },
      );
    }
    const l = layoutImagePage(embedded.width, embedded.height, opts);
    doc.addPage([l.pageWidth, l.pageHeight]).drawImage(embedded, {
      x: l.x,
      y: l.y,
      width: l.width,
      height: l.height,
    });
  }
  return doc.save({ useObjectStreams: true });
}
