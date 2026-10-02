import {
  fetchFontBytes,
  fontById,
  loadSignatureFont,
  type SignatureSource,
} from '@/pdf/sign';
import { layoutInk, slantInk } from '@/pdf/edit/text-fit';
import type { ModeProps } from '../types';
import { fillSign, type ReadySignature } from './store';

/** Turns the panel's source into a placeable signature (assets stored once). */
export async function prepare(
  ctx: ModeProps,
  source: SignatureSource,
): Promise<ReadySignature> {
  if (source.kind === 'ink' || source.kind === 'trace') {
    // The vector travels in the op itself: nothing to store. Traced photos
    // fill even-odd so the holes in loops stay open.
    const { kind, vector, color } = source;
    return {
      content: { kind, vector, color },
      aspect: vector.width / vector.height,
      preview: { kind: 'ink', vector, color, evenOdd: kind === 'trace' },
    };
  }
  if (source.kind === 'image') {
    const mime: 'image/png' | 'image/jpeg' =
      source.format === 'png' ? 'image/png' : 'image/jpeg';
    const assetId = ctx.doc.addAsset(source.bytes, mime);
    const preview = { kind: 'image' as const, bytes: source.bytes, mime };
    fillSign.set({
      previews: { ...fillSign.get().previews, [assetId]: preview },
    });
    return {
      content: { kind: 'image', assetId, mime },
      aspect: source.width / source.height,
      preview,
    };
  }
  const [bytes, font] = await Promise.all([
    fetchFontBytes(source.fontId),
    loadSignatureFont(source.fontId),
  ]);
  const fontAsset = ctx.doc.addAsset(bytes, 'font/woff');
  const slant = source.slant ?? 0;
  const preview = {
    kind: 'text' as const,
    text: source.text,
    family: fontById(source.fontId).family,
    color: source.color,
    ...(slant ? { slant } : {}),
  };
  fillSign.set({
    previews: { ...fillSign.get().previews, [fontAsset]: preview },
  });
  // The box takes the slanted ink's shape, as the writer lays it out.
  const ink = slantInk(layoutInk(font, source.text).ink, slant);
  return {
    content: {
      kind: 'text',
      text: source.text,
      fontId: source.fontId,
      fontAsset,
      color: source.color,
      ...(slant ? { slant } : {}),
      ...(source.size !== undefined ? { size: source.size } : {}),
    },
    aspect: (ink.maxX - ink.minX) / (ink.maxY - ink.minY),
    preview,
  };
}

/** The page centre in page space, as displayed. */
export function pageCentre(ctx: ModeProps) {
  const page = ctx.doc.view.pages.find((p) => p.id === ctx.doc.currentPage);
  if (!page) return null;
  const g = ctx.doc.pageGeom(page);
  const box = page.crop ?? {
    x: g.view[0],
    y: g.view[1],
    width: g.view[2] - g.view[0],
    height: g.view[3] - g.view[1],
  };
  return { page, x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
