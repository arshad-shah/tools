import { degrees, rgb, type PDFFont, type PDFImage } from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import { hexToRgb } from './color';
import { assertDrawable } from './fonts';
import { pageFrame, toPdfPlacement, visualSize } from './geometry';
import { loadPdf } from './load';
import { assertIndices } from './ops';
import { fitInk, layoutInk } from './text-fit';

/** Points, on the page as displayed; origin top-left, y down (like the preview). */
export interface VisualRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type StampContent =
  | { kind: 'image'; bytes: Uint8Array; format: 'png' | 'jpeg' }
  | { kind: 'text'; text: string; fontBytes: Uint8Array; color: string };

export interface StampOptions {
  pageIndex: number;
  rect: VisualRect;
  content: StampContent;
}

const invalid = (m: string) => new ToolError('INVALID_INPUT', m);

export async function stamp(
  bytes: Uint8Array,
  opts: StampOptions,
): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  assertIndices([opts.pageIndex], doc.getPageCount());
  const page = doc.getPage(opts.pageIndex);
  const frame = pageFrame(page);
  const visual = visualSize(frame);
  const r = opts.rect;
  if (!(r.width > 0 && r.height > 0))
    throw invalid('The signature box is empty');
  const eps = 0.5;
  if (
    r.x < -eps ||
    r.y < -eps ||
    r.x + r.width > visual.width + eps ||
    r.y + r.height > visual.height + eps
  ) {
    throw invalid('The signature must sit inside the page');
  }
  const bottom = visual.height - r.y - r.height; // visual, y up
  const c = opts.content;
  if (c.kind === 'image') {
    let image: PDFImage;
    try {
      image =
        c.format === 'png'
          ? await doc.embedPng(c.bytes)
          : await doc.embedJpg(c.bytes);
    } catch (cause) {
      throw new ToolError(
        'INVALID_FILE',
        'The signature image could not be read',
        { cause },
      );
    }
    const at = toPdfPlacement(frame, { x: r.x, y: bottom }, 0);
    page.drawImage(image, {
      x: at.x,
      y: at.y,
      width: r.width,
      height: r.height,
      rotate: degrees(at.rotate),
    });
  } else {
    const text = c.text.trim();
    if (!text) throw invalid('Type your name');
    // Loaded on demand: fontkit is large and only typed signatures need it.
    const { default: fontkit } = await import('@pdf-lib/fontkit');
    doc.registerFontkit(fontkit);
    let font: PDFFont;
    try {
      font = await doc.embedFont(c.fontBytes, { subset: true });
    } catch (cause) {
      throw new ToolError(
        'INVALID_FILE',
        'The signature font could not be embedded',
        { cause },
      );
    }
    assertDrawable(font, text, 'Your name');
    // Fit the real ink (script flourishes included), exactly as the
    // on-screen preview does, so nothing pokes out of the placed box.
    const fit = fitInk(r, layoutInk(fontkit.create(c.fontBytes), text).ink);
    const size = fit.size;
    const at = toPdfPlacement(frame, { x: r.x + fit.x, y: bottom + fit.y }, 0);
    const color = hexToRgb(c.color);
    page.drawText(text, {
      x: at.x,
      y: at.y,
      size,
      font,
      color: rgb(color.r, color.g, color.b),
      rotate: degrees(at.rotate),
    });
  }
  return doc.save({ useObjectStreams: true });
}
