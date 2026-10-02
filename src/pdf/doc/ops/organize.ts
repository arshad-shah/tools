import { ToolError } from '@/shared/lib/errors';
import { normalizeRotation, requireAll, withPages } from '../page-map';
import { defineOperation } from '../registry';
import type { Box, PageId, PageLabelRange, PageRef } from '../types';
import {
  asRecord,
  box,
  ids,
  int,
  pageList,
  plural,
  size,
  str,
} from './validate';

const count = (n: number, one: string, done: string) =>
  `${n} ${plural(n, one)} ${done}`;
const distinctPages = (ops: { pageIds: PageId[] }[]) =>
  new Set(ops.flatMap((o) => o.pageIds)).size;

const freshIds = (existing: readonly PageRef[], newIds: readonly string[]) => {
  const known = new Set(existing.map((p) => p.id));
  if (newIds.some((id) => known.has(id)))
    throw new ToolError('INVALID_INPUT', 'A new page id is already in use');
};

export const reorderPages = defineOperation<{ pageIds: PageId[]; to: number }>({
  type: 'page.reorder',
  v: 1,
  kind: 'structure',
  mode: 'organize',
  validate(p) {
    const o = asRecord(p, 'Move');
    return { pageIds: ids(o.pageIds, 'Move'), to: int(o.to, 'Move') };
  },
  label: (p, ctx) => `Move ${pageList(p.pageIds, ctx)} to position ${p.to + 1}`,
  summarize: (ops) => count(distinctPages(ops), 'page', 'moved'),
  applyToView(view, p) {
    requireAll(view, p.pageIds);
    const set = new Set(p.pageIds);
    // Moved pages keep their document order; `to` is where the first lands.
    const moving = view.pages.filter((pg) => set.has(pg.id));
    const rest = view.pages.filter((pg) => !set.has(pg.id));
    const at = Math.min(p.to, rest.length);
    return withPages(view, [
      ...rest.slice(0, at),
      ...moving,
      ...rest.slice(at),
    ]);
  },
});

export const rotatePages = defineOperation<{
  pageIds: PageId[];
  delta: 90 | -90 | 180;
}>({
  type: 'page.rotate',
  v: 1,
  kind: 'structure',
  mode: 'organize',
  validate(p) {
    const o = asRecord(p, 'Rotate');
    if (![90, -90, 180].includes(o.delta as number))
      throw new ToolError(
        'INVALID_INPUT',
        'Rotation must be 90, -90 or 180 degrees',
      );
    return {
      pageIds: ids(o.pageIds, 'Rotate'),
      delta: o.delta as 90 | -90 | 180,
    };
  },
  label: (p, ctx) =>
    p.delta === 180
      ? `Rotate ${pageList(p.pageIds, ctx)} by 180 degrees`
      : `Rotate ${pageList(p.pageIds, ctx)} ${p.delta === 90 ? 'clockwise' : 'anticlockwise'}`,
  summarize: (ops) => count(distinctPages(ops), 'page', 'rotated'),
  applyToView(view, p) {
    requireAll(view, p.pageIds);
    const set = new Set(p.pageIds);
    return withPages(
      view,
      view.pages.map((pg) =>
        set.has(pg.id)
          ? { ...pg, rotate: normalizeRotation(pg.rotate + p.delta) }
          : pg,
      ),
    );
  },
});

export const deletePages = defineOperation<{ pageIds: PageId[] }>({
  type: 'page.delete',
  v: 1,
  kind: 'structure',
  mode: 'organize',
  validate(p) {
    return { pageIds: ids(asRecord(p, 'Delete').pageIds, 'Delete') };
  },
  label: (p, ctx) => `Delete ${pageList(p.pageIds, ctx)}`,
  summarize: (ops) => count(distinctPages(ops), 'page', 'deleted'),
  applyToView(view, p) {
    requireAll(view, p.pageIds);
    const set = new Set(p.pageIds);
    const pages = view.pages.filter((pg) => !set.has(pg.id));
    if (pages.length === 0)
      throw new ToolError(
        'INVALID_INPUT',
        'The document must keep at least one page',
      );
    return withPages(view, pages);
  },
});

export const duplicatePages = defineOperation<{
  pageIds: PageId[];
  newIds: PageId[];
}>({
  type: 'page.duplicate',
  v: 1,
  kind: 'structure',
  mode: 'organize',
  validate(p) {
    const o = asRecord(p, 'Duplicate');
    const pageIds = ids(o.pageIds, 'Duplicate');
    const newIds = ids(o.newIds, 'Duplicate');
    if (newIds.length !== pageIds.length)
      throw new ToolError('INVALID_INPUT', 'Duplicate: one new id per page');
    return { pageIds, newIds };
  },
  label: (p, ctx) => `Duplicate ${pageList(p.pageIds, ctx)}`,
  summarize: (ops) =>
    count(
      ops.reduce((n, o) => n + o.pageIds.length, 0),
      'page',
      'duplicated',
    ),
  applyToView(view, p) {
    requireAll(view, p.pageIds);
    freshIds(view.pages, p.newIds);
    const copyOf = new Map(p.pageIds.map((id, i) => [id, p.newIds[i]]));
    const original = new Map(p.newIds.map((id, i) => [id, p.pageIds[i]]));
    return withPages(
      view,
      view.pages.flatMap((pg) => {
        const copy = copyOf.get(pg.id);
        return copy ? [pg, { ...pg, id: copy }] : [pg];
      }),
      (id) => original.get(id) ?? id,
    );
  },
});

export const insertBlankPage = defineOperation<{
  at: number;
  newId: PageId;
  width: number;
  height: number;
}>({
  type: 'page.insertBlank',
  v: 1,
  kind: 'structure',
  mode: 'organize',
  validate(p) {
    const o = asRecord(p, 'Insert blank page');
    return {
      at: int(o.at, 'Insert blank page'),
      newId: str(o.newId, 'Insert blank page'),
      width: size(o.width, 'The page width'),
      height: size(o.height, 'The page height'),
    };
  },
  label: (p) => `Insert a blank page at position ${p.at + 1}`,
  summarize: (ops) => count(ops.length, 'blank page', 'inserted'),
  applyToView(view, p) {
    freshIds(view.pages, [p.newId]);
    const at = Math.min(p.at, view.pages.length);
    const blank: PageRef = {
      id: p.newId,
      source: '',
      index: 0,
      rotate: 0,
      blank: { width: p.width, height: p.height },
    };
    return withPages(view, [
      ...view.pages.slice(0, at),
      blank,
      ...view.pages.slice(at),
    ]);
  },
});

export const cropPages = defineOperation<{ pageIds: PageId[]; box: Box }>({
  type: 'page.crop',
  v: 1,
  kind: 'structure',
  mode: 'organize',
  validate(p) {
    const o = asRecord(p, 'Crop');
    return { pageIds: ids(o.pageIds, 'Crop'), box: box(o.box, 'Crop') };
  },
  label: (p, ctx) => `Crop ${pageList(p.pageIds, ctx)}`,
  summarize: (ops) => count(distinctPages(ops), 'page', 'cropped'),
  applyToView(view, p) {
    requireAll(view, p.pageIds);
    const set = new Set(p.pageIds);
    return withPages(
      view,
      view.pages.map((pg) => (set.has(pg.id) ? { ...pg, crop: p.box } : pg)),
    );
  },
});

export const resizePages = defineOperation<{
  pageIds: PageId[];
  width: number;
  height: number;
}>({
  type: 'page.resize',
  v: 1,
  kind: 'structure',
  mode: 'organize',
  validate(p) {
    const o = asRecord(p, 'Page size');
    return {
      pageIds: ids(o.pageIds, 'Page size'),
      width: size(o.width, 'The page width'),
      height: size(o.height, 'The page height'),
    };
  },
  label: (p, ctx) => `Change the size of ${pageList(p.pageIds, ctx)}`,
  summarize: (ops) => count(distinctPages(ops), 'page', 'resized'),
  applyToView(view, p) {
    requireAll(view, p.pageIds);
    const set = new Set(p.pageIds);
    const sized = { width: p.width, height: p.height };
    return withPages(
      view,
      view.pages.map((pg) => (set.has(pg.id) ? { ...pg, size: sized } : pg)),
    );
  },
});

const STYLES = new Set(['D', 'r', 'R', 'a', 'A', null]);

export const labelPages = defineOperation<{ ranges: PageLabelRange[] }>({
  type: 'page.label',
  v: 1,
  kind: 'structure',
  mode: 'organize',
  validate(p) {
    const o = asRecord(p, 'Page labels');
    if (!Array.isArray(o.ranges))
      throw new ToolError('INVALID_INPUT', 'Page labels: expected ranges');
    const ranges = o.ranges.map((r): PageLabelRange => {
      const x = asRecord(r, 'Page labels');
      if (!STYLES.has(x.style as string | null))
        throw new ToolError('INVALID_INPUT', 'Page labels: unknown style');
      if (x.prefix !== undefined && typeof x.prefix !== 'string')
        throw new ToolError('INVALID_INPUT', 'Page labels: bad prefix');
      return {
        start: int(x.start, 'Page labels'),
        style: x.style as PageLabelRange['style'],
        ...(x.prefix !== undefined ? { prefix: x.prefix as string } : {}),
        ...(x.first !== undefined
          ? { first: int(x.first, 'Page labels', 1) }
          : {}),
      };
    });
    if (ranges.some((r, i) => i > 0 && r.start <= ranges[i - 1].start))
      throw new ToolError(
        'INVALID_INPUT',
        'Page label ranges must start on increasing pages',
      );
    if (ranges.length && ranges[0].start !== 0)
      throw new ToolError(
        'INVALID_INPUT',
        'The first page label range must start on page 1',
      );
    return { ranges };
  },
  label: (p) =>
    p.ranges.length === 0 ? 'Remove page labels' : 'Set page labels',
  summarize: (ops) =>
    ops[ops.length - 1].ranges.length === 0
      ? 'Page labels removed'
      : 'Page labels set',
  applyToView(view, p) {
    if (p.ranges.some((r) => r.start >= view.pages.length))
      throw new ToolError(
        'INVALID_INPUT',
        `A page label range starts after the last page (${view.pages.length})`,
      );
    return { ...view, pageLabels: p.ranges };
  },
});

export const mergeInPages = defineOperation<{
  sourceId: string;
  at: number;
  newIds: PageId[];
}>({
  type: 'page.mergeIn',
  v: 1,
  kind: 'structure',
  mode: 'organize',
  validate(p) {
    const o = asRecord(p, 'Merge in');
    return {
      sourceId: str(o.sourceId, 'Merge in'),
      at: int(o.at, 'Merge in'),
      newIds: ids(o.newIds, 'Merge in'),
    };
  },
  label: (p) =>
    `Insert ${p.newIds.length} ${plural(p.newIds.length, 'page')} from another file at position ${p.at + 1}`,
  summarize: (ops) => {
    const files = new Set(ops.map((o) => o.sourceId)).size;
    return `${files} ${plural(files, 'file')} merged in`;
  },
  applyToView(view, p) {
    freshIds(view.pages, p.newIds);
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

export const ORGANIZE_OPS = [
  reorderPages,
  rotatePages,
  deletePages,
  duplicatePages,
  insertBlankPage,
  cropPages,
  resizePages,
  labelPages,
  mergeInPages,
] as const;
