import { ToolError } from '@/shared/lib/errors';
import {
  drawArrow,
  drawBox,
  drawEllipse,
  drawImage,
  drawTextBox,
} from '@/pdf/edit/draw';
import type { FontSpec } from '@/pdf/edit/font-cache';
import {
  lineEnds,
  type ContentFont,
  type ContentShapeParams,
  type ImageParams,
  type TextParams,
} from '../ops/edit';
import { defineMaterializer, type Materializer } from './registry';

export function fontSpec(font: ContentFont): FontSpec {
  return font === 'unicode' ? { unicode: true } : { standard: font };
}

/** Unsupported characters name the fix the Edit inspector offers. */
const UNICODE_HINT = 'Use the Unicode font for these characters.';

const text = defineMaterializer<TextParams>({
  type: 'content.text',
  phase: 'content',
  async apply(ctx, p) {
    const page = ctx.page(p.pageId);
    if (!page) return;
    try {
      await drawTextBox(ctx.draw, page, p.text, p.rect, {
        font: fontSpec(p.font),
        size: p.size,
        color: p.color,
        align: p.align,
        lineHeight: p.lineHeight,
        rotate: p.rotate,
      });
    } catch (e) {
      if (
        e instanceof ToolError &&
        e.code === 'INVALID_INPUT' &&
        p.font !== 'unicode'
      )
        throw new ToolError('INVALID_INPUT', `${e.message}. ${UNICODE_HINT}`, {
          cause: e,
        });
      throw e;
    }
  },
});

const image = defineMaterializer<ImageParams>({
  type: 'content.image',
  phase: 'content',
  async apply(ctx, p) {
    const page = ctx.page(p.pageId);
    if (!page) return;
    await drawImage(ctx.draw, page, ctx.asset(p.assetId), p.mime, p.rect, {
      opacity: p.opacity < 1 ? p.opacity : undefined,
      rotate: p.rotate,
    });
  },
});

const shape = defineMaterializer<ContentShapeParams>({
  type: 'content.shape',
  phase: 'content',
  apply(ctx, p) {
    const page = ctx.page(p.pageId);
    if (!page) return;
    const opacity = p.opacity < 1 ? p.opacity : undefined;
    const paint = {
      fill: p.fill ?? undefined,
      stroke: p.stroke ?? undefined,
      width: p.width,
      opacity,
      rotate: p.rotate,
    };
    if (p.kind === 'rect') return drawBox(page, p.rect, paint);
    if (p.kind === 'ellipse') return drawEllipse(page, p.rect, paint);
    const [from, to] = lineEnds(p);
    drawArrow(page, from, to, {
      color: p.stroke!,
      width: p.width,
      opacity,
      rotate: p.rotate,
      about: p.rect,
      head: p.kind === 'arrow',
    });
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const EDIT_CONTENT_MATERIALIZERS: readonly Materializer<any>[] = [
  text,
  image,
  shape,
];
