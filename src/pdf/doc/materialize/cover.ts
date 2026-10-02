import { ToolError } from '@/shared/lib/errors';
import { drawBox, drawText } from '@/pdf/edit/draw';
import type { CoverParams } from '../ops/cover';
import { fontSpec } from './edit';
import { defineMaterializer, type Materializer } from './registry';

/** A filled box, then the new text on it (content phase). The original stays in the file. */
const cover = defineMaterializer<CoverParams>({
  type: 'content.cover',
  phase: 'content',
  async apply(ctx, p) {
    const page = ctx.page(p.pageId);
    if (!page) return;
    drawBox(page, p.rect, { fill: p.fill });
    if (!p.text.trim()) return;
    try {
      await drawText(ctx.draw, page, p.text, p.rect, {
        font: fontSpec(p.font),
        size: p.size,
        color: p.color,
        align: p.align,
        multiline: true,
        fit: 'shrink',
      });
    } catch (e) {
      if (
        e instanceof ToolError &&
        e.code === 'INVALID_INPUT' &&
        p.font !== 'unicode'
      )
        throw new ToolError(
          'INVALID_INPUT',
          `${e.message}. Use the Unicode font for these characters.`,
          { cause: e },
        );
      throw e;
    }
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const COVER_MATERIALIZERS: readonly Materializer<any>[] = [cover];
