import {
  PDFName,
  StandardFonts,
  type PDFDocument,
  type PDFImage,
  type PDFPage,
  type PDFRef,
} from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import type { Box } from '../draw';
import { fitText } from '../draw-fit';
import { assertDrawable } from '../fonts';
import {
  appearanceStream,
  fmt,
  opacityState,
  rgbOps,
  setAppearance,
} from './appearance';
import { addToPage, baseAnnot, type AnnotBase } from './common';
import { STAMP_BORDER, stampTextBox } from './geometry';
import { STAMP_LABELS, type StampPreset } from './presets';

export { STAMP_LABELS, STAMP_PRESETS, type StampPreset } from './presets';

export interface StampParams extends AnnotBase {
  rect: Box;
  preset?: StampPreset;
  label?: string;
  image?: { bytes: Uint8Array; mime: 'image/png' | 'image/jpeg' };
}

const RADIUS = 6;
const K = 0.5523;

function roundedRect(b: Box, r: number): string {
  const { x, y, width: w, height: h } = b;
  const k = r * K;
  return [
    `${fmt(x + r)} ${fmt(y)} m`,
    `${fmt(x + w - r)} ${fmt(y)} l`,
    `${fmt(x + w - r + k)} ${fmt(y)} ${fmt(x + w)} ${fmt(y + r - k)} ${fmt(x + w)} ${fmt(y + r)} c`,
    `${fmt(x + w)} ${fmt(y + h - r)} l`,
    `${fmt(x + w)} ${fmt(y + h - r + k)} ${fmt(x + w - r + k)} ${fmt(y + h)} ${fmt(x + w - r)} ${fmt(y + h)} c`,
    `${fmt(x + r)} ${fmt(y + h)} l`,
    `${fmt(x + r - k)} ${fmt(y + h)} ${fmt(x)} ${fmt(y + h - r + k)} ${fmt(x)} ${fmt(y + h - r)} c`,
    `${fmt(x)} ${fmt(y + r)} l`,
    `${fmt(x)} ${fmt(y + r - k)} ${fmt(x + r - k)} ${fmt(y)} ${fmt(x + r)} ${fmt(y)} c h`,
  ].join(' ');
}

/** The text a stamp shows: the custom label or the preset's, upper case. */
export function stampText(p: Pick<StampParams, 'preset' | 'label'>): string {
  const text = p.label ?? (p.preset ? STAMP_LABELS[p.preset] : '');
  return text.toUpperCase();
}

export { STAMP_BORDER, stampTextBox } from './geometry';

async function embedImage(
  doc: PDFDocument,
  image: NonNullable<StampParams['image']>,
): Promise<PDFImage> {
  try {
    return image.mime === 'image/png'
      ? await doc.embedPng(image.bytes)
      : await doc.embedJpg(image.bytes);
  } catch (cause) {
    throw new ToolError('INVALID_FILE', 'The image could not be read', {
      cause,
    });
  }
}

/**
 * /Stamp: a preset or custom text stamp (rounded 2pt border in the colour,
 * Helvetica-Bold label fitted), or an image stamp drawn from its XObject.
 */
export async function writeStamp(
  doc: PDFDocument,
  page: PDFPage,
  p: StampParams,
): Promise<PDFRef> {
  const { rect } = p;
  if (!(rect.width > 0 && rect.height > 0))
    throw new ToolError('INVALID_INPUT', 'The stamp needs a size');
  const [content, resources] = await stampAppearance(doc, p);
  const dict = baseAnnot(doc, page, 'Stamp', rect, {
    ...p,
    contents: p.contents || stampText(p),
  });
  if (p.preset) dict.set(PDFName.of('Name'), PDFName.of(p.preset));
  setAppearance(dict, appearanceStream(doc, rect, content, resources));
  return addToPage(doc, page, dict);
}

/** Image or bordered-label appearance of a stamp (page space). */
export async function stampAppearance(
  doc: PDFDocument,
  p: Pick<
    StampParams,
    'rect' | 'preset' | 'label' | 'image' | 'color' | 'opacity'
  >,
): Promise<[string, Record<string, unknown>]> {
  const { rect } = p;
  const resources: Record<string, unknown> = {
    ExtGState: { GS0: opacityState(p.opacity) },
  };
  const ops = ['q', '/GS0 gs'];
  if (p.image) {
    const img = await embedImage(doc, p.image);
    resources.XObject = { Im0: img.ref };
    ops.push(
      `${fmt(rect.width)} 0 0 ${fmt(rect.height)} ${fmt(rect.x)} ${fmt(rect.y)} cm`,
      '/Im0 Do',
    );
  } else {
    const text = stampText(p);
    if (!text) throw new ToolError('INVALID_INPUT', 'The stamp needs a label');
    const font = doc.embedStandardFont(StandardFonts.HelveticaBold);
    assertDrawable(font, text, 'The stamp label');
    const inner = stampTextBox(rect);
    const { size, lines } = fitText(font, text, inner, {
      size: 'auto',
      minSize: 4,
      multiline: false,
    });
    const half = STAMP_BORDER / 2;
    ops.push(
      rgbOps(p.color, true),
      `${fmt(STAMP_BORDER)} w`,
      `${roundedRect({ x: rect.x + half, y: rect.y + half, width: rect.width - STAMP_BORDER, height: rect.height - STAMP_BORDER }, RADIUS)} S`,
    );
    if (lines.length) {
      const line = lines[0];
      const w = font.widthOfTextAtSize(line, size);
      // drawText's single-line baseline, so the overlay preview matches.
      const lineH = size * 1.2;
      const x = inner.x + (inner.width - w) / 2;
      const y =
        inner.y +
        (inner.height + lineH) / 2 -
        (lineH - font.heightAtSize(size)) / 2 -
        font.heightAtSize(size, { descender: false });
      resources.Font = { HeBo: font.ref };
      ops.push(
        'BT',
        rgbOps(p.color, false),
        `/HeBo ${fmt(size)} Tf`,
        `1 0 0 1 ${fmt(x)} ${fmt(y)} Tm`,
        `${font.encodeText(line).toString()} Tj`,
        'ET',
      );
    }
  }
  ops.push('Q');
  return [ops.join('\n'), resources];
}
