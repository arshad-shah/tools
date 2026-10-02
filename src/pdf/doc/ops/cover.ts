import { defineOperation } from '../registry';
import type { Box, PageId } from '../types';
import { hex, num, oneOf, text } from './annotate-params';
import { addOverlay, count, onPage } from './annotate-shared';
import { CONTENT_FONTS, type ContentFont } from './edit';
import { asRecord, box, str } from './validate';

/** Cover and replace (spec §9.2): a filled rectangle with new text on top. */
export interface CoverParams {
  id: string;
  pageId: PageId;
  rect: Box;
  fill: string;
  text: string;
  font: ContentFont;
  size: number;
  color: string;
  align: 'left' | 'center' | 'right';
}

export const contentCover = defineOperation<CoverParams>({
  type: 'content.cover',
  v: 1,
  kind: 'overlay',
  mode: 'edit',
  validate(p) {
    const o = asRecord(p, 'Cover');
    return {
      id: str(o.id, 'Cover'),
      pageId: str(o.pageId, 'Cover'),
      rect: box(o.rect, 'Cover'),
      fill: hex(o.fill, 'Cover'),
      text: text(o.text ?? '', 'Cover'),
      font: oneOf(o.font ?? 'Helvetica', CONTENT_FONTS, 'Cover'),
      size: num(o.size ?? 12, 'Cover', 4, 288),
      color: hex(o.color ?? '#000000', 'Cover'),
      align: oneOf(
        o.align ?? 'left',
        ['left', 'center', 'right'] as const,
        'Cover',
      ),
    };
  },
  label: (p, ctx) => `Cover and replace ${onPage(p.pageId, ctx)}`,
  summarize: (ops) => `${count(ops.length, 'area')} covered`,
  applyToView: addOverlay,
});

export const COVER_OPS = [contentCover] as const;
