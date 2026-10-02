import { ToolError } from '@/shared/lib/errors';
import type {
  CheckpointMeta,
  DocView,
  OpId,
  OverlayItem,
  PageId,
  PageLabelRange,
  PageRef,
  Rotation,
  SourceRef,
} from './types';

/** 0, 90, 180 or 270 for any multiple of 90 (negative included). */
export const normalizeRotation = (angle: number): Rotation =>
  ((((Math.round(angle / 90) * 90) % 360) + 360) % 360) as Rotation;

/** The checkpoint's pages in order, ids `${checkpoint.id}:${i}`, nothing pending. */
export function baseView(
  checkpoint: CheckpointMeta,
  source: SourceRef,
): DocView {
  return {
    checkpoint: checkpoint.id,
    pages: source.pages.map((_, i) => ({
      id: `${checkpoint.id}:${i}`,
      source: source.id,
      index: i,
      rotate: 0,
    })),
    overlays: new Map(),
    docOverlays: [],
    pageLabels: null,
    hidden: new Set(),
  };
}

/** 1-based position of a page in the view, or null when it is gone. */
export function pageNumberOf(view: DocView, id: PageId): number | null {
  const i = view.pages.findIndex((p) => p.id === id);
  return i < 0 ? null : i + 1;
}

interface PageLabel {
  style: PageLabelRange['style'];
  prefix?: string;
  n: number;
}

function labelAt(
  ranges: readonly PageLabelRange[],
  i: number,
): PageLabel | null {
  let r: PageLabelRange | undefined;
  for (const x of ranges) if (x.start <= i) r = x;
  if (!r) return null;
  return { style: r.style, prefix: r.prefix, n: (r.first ?? 1) + i - r.start };
}

/**
 * Page labels for a new page order, each page keeping the label it had
 * (`from` names the old page a new one shows; a page with no old page, a
 * blank or merged-in one, continues the page before it). Labels that no
 * longer number in sequence get a range of their own. Null and [] are kept.
 */
export function remapPageLabels(
  ranges: readonly PageLabelRange[] | null,
  oldIds: readonly PageId[],
  newIds: readonly PageId[],
  from: (id: PageId) => PageId | undefined = (id) => id,
): readonly PageLabelRange[] | null {
  if (!ranges?.length) return ranges;
  const was = new Map(oldIds.map((id, i) => [id, labelAt(ranges, i)]));
  const out: PageLabelRange[] = [];
  let prev: PageLabel | null = null;
  for (const [i, id] of newIds.entries()) {
    const old = from(id);
    const label: PageLabel = (old !== undefined ? was.get(old) : null) ??
      (prev ? { ...prev, n: prev.n + 1 } : null) ?? {
        style: ranges[0].style,
        prefix: ranges[0].prefix,
        n: ranges[0].first ?? 1,
      };
    const continues =
      prev !== null &&
      prev.style === label.style &&
      prev.prefix === label.prefix &&
      (label.style === null || label.n === prev.n + 1);
    if (!continues)
      out.push({
        start: i,
        style: label.style,
        ...(label.prefix !== undefined ? { prefix: label.prefix } : {}),
        ...(label.style !== null && label.n !== 1 ? { first: label.n } : {}),
      });
    prev = label;
  }
  return out;
}

const sameIds = (a: readonly PageRef[], b: readonly PageRef[]) =>
  a.length === b.length && a.every((p, i) => p.id === b[i].id);

/**
 * Replaces the page list; page labels follow their pages (see
 * `remapPageLabels`, whose `from` maps a copy to its original).
 */
export function withPages(
  view: DocView,
  pages: PageRef[],
  from?: (id: PageId) => PageId | undefined,
): DocView {
  const pageLabels = sameIds(view.pages, pages)
    ? view.pageLabels
    : remapPageLabels(
        view.pageLabels,
        view.pages.map((p) => p.id),
        pages.map((p) => p.id),
        from,
      );
  return { ...view, pages, pageLabels };
}

/** Appends an overlay item; copies only the affected page's list. */
export function withOverlay(view: DocView, item: OverlayItem): DocView {
  if (item.pageId === null)
    return { ...view, docOverlays: [...view.docOverlays, item] };
  const overlays = new Map(view.overlays);
  overlays.set(item.pageId, [...(overlays.get(item.pageId) ?? []), item]);
  return { ...view, overlays };
}

/** The overlay item an op created, wherever it sits. */
export function findOverlay(view: DocView, opId: OpId): OverlayItem | null {
  for (const list of view.overlays.values())
    for (const item of list) if (item.opId === opId) return item;
  return view.docOverlays.find((o) => o.opId === opId) ?? null;
}

/** Replaces one overlay item (matched by op id) with `next`. */
export function replaceOverlay(
  view: DocView,
  opId: OpId,
  next: (item: OverlayItem) => OverlayItem,
): DocView {
  const doc = view.docOverlays.findIndex((o) => o.opId === opId);
  if (doc >= 0) {
    const docOverlays = [...view.docOverlays];
    docOverlays[doc] = next(docOverlays[doc]);
    return { ...view, docOverlays };
  }
  for (const [pageId, list] of view.overlays) {
    const i = list.findIndex((o) => o.opId === opId);
    if (i < 0) continue;
    const overlays = new Map(view.overlays);
    const copy = [...list];
    copy[i] = next(copy[i]);
    overlays.set(pageId, copy);
    return { ...view, overlays };
  }
  return view;
}

export function withHidden(view: DocView, opId: OpId): DocView {
  return { ...view, hidden: new Set(view.hidden).add(opId) };
}

/** The rotation a page shows: its source page's own /Rotate plus the pending one. */
export function effectiveRotation(
  page: PageRef,
  source: SourceRef | undefined,
): Rotation {
  const own = page.blank ? 0 : (source?.pages[page.index]?.rotate ?? 0);
  return normalizeRotation(own + page.rotate);
}

/** Throws INVALID_INPUT "Page no longer exists" unless every id is in the view. */
export function requireAll(view: DocView, ids: readonly PageId[]): void {
  const known = new Set(view.pages.map((p) => p.id));
  if (!ids.every((id) => known.has(id)))
    throw new ToolError('INVALID_INPUT', 'Page no longer exists');
}
