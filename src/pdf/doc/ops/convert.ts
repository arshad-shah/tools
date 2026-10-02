import { ToolError } from '@/shared/lib/errors';
import { withPages } from '../page-map';
import { defineOperation } from '../registry';
import type { PageId, PageRef, SourceId } from '../types';
import { asRecord, ids, int, plural, str } from './validate';

/**
 * "Insert images as pages" (spec 7.2 Convert row): the images were turned
 * into a PDF source (imagesToPdf in the edit worker, DocumentApi.addSource);
 * its pages go in at `at`. Written by arrangePages from `plan.sources`, the
 * same path as page.mergeIn, so no overlay writer is needed.
 */
export const insertImagePages = defineOperation<{
  at: number;
  sourceId: SourceId;
  newIds: PageId[];
}>({
  type: 'page.insertImages',
  v: 1,
  kind: 'structure',
  mode: 'convert',
  validate(p) {
    const o = asRecord(p, 'Insert images');
    return {
      at: int(o.at, 'Insert images'),
      sourceId: str(o.sourceId, 'Insert images'),
      newIds: ids(o.newIds, 'Insert images'),
    };
  },
  label: (p) =>
    p.newIds.length === 1
      ? `Insert 1 image as a page at position ${p.at + 1}`
      : `Insert ${p.newIds.length} images as pages at position ${p.at + 1}`,
  summarize: (ops) => {
    const n = ops.reduce((sum, o) => sum + o.newIds.length, 0);
    return `${n} ${plural(n, 'image')} inserted as ${plural(n, 'a page', 'pages')}`;
  },
  applyToView(view, p) {
    const known = new Set(view.pages.map((pg) => pg.id));
    if (p.newIds.some((id) => known.has(id)))
      throw new ToolError('INVALID_INPUT', 'A new page id is already in use');
    const at = Math.min(p.at, view.pages.length);
    const added: PageRef[] = p.newIds.map((id, index) => ({
      id,
      source: p.sourceId,
      index,
      rotate: 0,
    }));
    return withPages(view, [
      ...view.pages.slice(0, at),
      ...added,
      ...view.pages.slice(at),
    ]);
  },
});

export const CONVERT_OPS = [insertImagePages] as const;
