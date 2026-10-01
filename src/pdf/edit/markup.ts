import { degrees, rgb, StandardFonts, type PDFImage } from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import { hexToRgb } from './color';
import { assertDrawable } from './fonts';
import {
  anchoredOrigin,
  pageFrame,
  toPdfPlacement,
  visualSize,
  type Anchor,
  type EdgeAnchor,
} from './geometry';
import { loadPdf } from './load';
import { assertIndices } from './ops';

const invalid = (m: string) => new ToolError('INVALID_INPUT', m);

export type WatermarkContent =
  | { kind: 'text'; text: string; fontSize: number; color: string }
  | {
      kind: 'image';
      bytes: Uint8Array;
      format: 'png' | 'jpeg';
      widthFraction: number;
    };

export interface WatermarkOptions {
  content: WatermarkContent;
  opacity: number;
  /** Degrees, counter-clockwise as seen on screen. */
  rotation: number;
  position: Anchor;
  margin: number;
  pages: number[];
}

export async function watermark(
  bytes: Uint8Array,
  opts: WatermarkOptions,
): Promise<Uint8Array> {
  if (!(opts.opacity > 0 && opts.opacity <= 1))
    throw invalid('Opacity must be between 1% and 100%');
  const doc = await loadPdf(bytes);
  assertIndices(opts.pages, doc.getPageCount());
  const c = opts.content;
  if (c.kind === 'text') {
    const label = c.text.replace(/\s+/g, ' ').trim();
    if (!label) throw invalid('Enter the watermark text');
    if (!(c.fontSize >= 6 && c.fontSize <= 400))
      throw invalid('Font size must be between 6 and 400');
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    assertDrawable(font, label, 'The watermark text');
    const color = hexToRgb(c.color);
    const box = {
      width: font.widthOfTextAtSize(label, c.fontSize),
      height: font.heightAtSize(c.fontSize, { descender: false }),
    };
    for (const i of opts.pages) {
      const page = doc.getPage(i);
      const frame = pageFrame(page);
      const at = toPdfPlacement(
        frame,
        anchoredOrigin(
          visualSize(frame),
          opts.position,
          box,
          opts.rotation,
          opts.margin,
        ),
        opts.rotation,
      );
      page.drawText(label, {
        x: at.x,
        y: at.y,
        size: c.fontSize,
        font,
        color: rgb(color.r, color.g, color.b),
        opacity: opts.opacity,
        rotate: degrees(at.rotate),
      });
    }
  } else {
    if (!(c.widthFraction > 0 && c.widthFraction <= 1))
      throw invalid('Image width must be between 1% and 100% of the page');
    let image: PDFImage;
    try {
      image =
        c.format === 'png'
          ? await doc.embedPng(c.bytes)
          : await doc.embedJpg(c.bytes);
    } catch (cause) {
      throw new ToolError(
        'INVALID_FILE',
        'The watermark image could not be read',
        { cause },
      );
    }
    for (const i of opts.pages) {
      const page = doc.getPage(i);
      const frame = pageFrame(page);
      const visual = visualSize(frame);
      const width = visual.width * c.widthFraction;
      const box = { width, height: (width * image.height) / image.width };
      const at = toPdfPlacement(
        frame,
        anchoredOrigin(visual, opts.position, box, opts.rotation, opts.margin),
        opts.rotation,
      );
      page.drawImage(image, {
        x: at.x,
        y: at.y,
        width: box.width,
        height: box.height,
        opacity: opts.opacity,
        rotate: degrees(at.rotate),
      });
    }
  }
  return doc.save({ useObjectStreams: true });
}

export type PageNumberFormat = 'n' | 'n-of-total' | 'page-n';
export const PAGE_NUMBER_FORMATS: Record<PageNumberFormat, string> = {
  n: '{n}',
  'n-of-total': '{n} / {total}',
  'page-n': 'Page {n}',
};

export function formatPageNumber(
  format: PageNumberFormat,
  n: number,
  total: number,
): string {
  return PAGE_NUMBER_FORMATS[format]
    .replace('{n}', String(n))
    .replace('{total}', String(total));
}

export interface PageNumberOptions {
  format: PageNumberFormat;
  position: EdgeAnchor;
  startAt: number;
  pages: number[];
  fontSize: number;
  margin: number;
  /** Defaults to the last number drawn (startAt + pages − 1). */
  total?: number;
}

export async function pageNumbers(
  bytes: Uint8Array,
  opts: PageNumberOptions,
): Promise<Uint8Array> {
  if (!Number.isInteger(opts.startAt) || opts.startAt < 0)
    throw invalid('Start number must be a whole number of 0 or more');
  if (!(opts.fontSize >= 6 && opts.fontSize <= 72))
    throw invalid('Font size must be between 6 and 72');
  const doc = await loadPdf(bytes);
  assertIndices(opts.pages, doc.getPageCount());
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = [...new Set(opts.pages)].sort((a, b) => a - b);
  const total = opts.total ?? opts.startAt + pages.length - 1;
  pages.forEach((pageIndex, k) => {
    const label = formatPageNumber(opts.format, opts.startAt + k, total);
    const page = doc.getPage(pageIndex);
    const frame = pageFrame(page);
    const box = {
      width: font.widthOfTextAtSize(label, opts.fontSize),
      height: font.heightAtSize(opts.fontSize, { descender: false }),
    };
    const at = toPdfPlacement(
      frame,
      anchoredOrigin(visualSize(frame), opts.position, box, 0, opts.margin),
      0,
    );
    page.drawText(label, {
      x: at.x,
      y: at.y,
      size: opts.fontSize,
      font,
      color: rgb(0, 0, 0),
      rotate: degrees(at.rotate),
    });
  });
  return doc.save({ useObjectStreams: true });
}
