import type { PDFPage } from 'pdf-lib';
import type { Rotation } from './ops';
import { parsePageRanges, rangesToIndices } from './ranges';

export interface PageFrame {
  x0: number;
  y0: number;
  width: number;
  height: number;
  rotation: Rotation;
}
export interface Size {
  width: number;
  height: number;
}
export interface Point {
  x: number;
  y: number;
}
export interface Placement {
  x: number;
  y: number;
  rotate: number;
}

export type Anchor =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';
export type EdgeAnchor = Exclude<
  Anchor,
  'middle-left' | 'center' | 'middle-right'
>;
export type PageSelection = { mode: 'all' } | { mode: 'ranges'; text: string };

const LABELS: Record<Anchor, string> = {
  'top-left': 'Top left',
  'top-center': 'Top centre',
  'top-right': 'Top right',
  'middle-left': 'Middle left',
  center: 'Centre',
  'middle-right': 'Middle right',
  'bottom-left': 'Bottom left',
  'bottom-center': 'Bottom centre',
  'bottom-right': 'Bottom right',
};
export const ANCHOR_OPTIONS = (Object.keys(LABELS) as Anchor[]).map(
  (value) => ({ value, label: LABELS[value] }),
);
export const EDGE_ANCHOR_OPTIONS = ANCHOR_OPTIONS.filter(
  (o): o is { value: EdgeAnchor; label: string } =>
    !['middle-left', 'center', 'middle-right'].includes(o.value),
);

export function normalizeRotation(angle: number): Rotation {
  return ((((Math.round(angle / 90) * 90) % 360) + 360) % 360) as Rotation;
}

export function pageFrame(page: PDFPage): PageFrame {
  const box = page.getCropBox();
  return {
    x0: box.x,
    y0: box.y,
    width: box.width,
    height: box.height,
    rotation: normalizeRotation(page.getRotation().angle),
  };
}

export function visualSize(f: PageFrame): Size {
  return f.rotation % 180 === 0
    ? { width: f.width, height: f.height }
    : { width: f.height, height: f.width };
}

/** Visual (as displayed, origin bottom-left, y up) → PDF user space. */
export function visualToPdf(f: PageFrame, p: Point): Point {
  switch (f.rotation) {
    case 0:
      return { x: f.x0 + p.x, y: f.y0 + p.y };
    case 90: // displayed turned clockwise
      return { x: f.x0 + f.width - p.y, y: f.y0 + p.x };
    case 180:
      return { x: f.x0 + f.width - p.x, y: f.y0 + f.height - p.y };
    case 270:
      return { x: f.x0 + p.y, y: f.y0 + f.height - p.x };
  }
}

/**
 * Origin and pdf-lib rotation for content whose visual origin (bottom-left,
 * before its own rotation) is `origin`, turned `visualAngle` degrees
 * counter-clockwise on screen. Adding the page rotation keeps it upright.
 */
export function toPdfPlacement(
  f: PageFrame,
  origin: Point,
  visualAngle = 0,
): Placement {
  return {
    ...visualToPdf(f, origin),
    rotate: (((visualAngle + f.rotation) % 360) + 360) % 360,
  };
}

export function placeBox(
  visual: Size,
  anchor: Anchor,
  box: Size,
  margin: number,
): Point {
  const [v, h] = anchor === 'center' ? ['middle', 'center'] : anchor.split('-');
  const x =
    h === 'left'
      ? margin
      : h === 'right'
        ? visual.width - margin - box.width
        : (visual.width - box.width) / 2;
  const y =
    v === 'bottom'
      ? margin
      : v === 'top'
        ? visual.height - margin - box.height
        : (visual.height - box.height) / 2;
  return { x, y };
}

const rad = (deg: number) => (deg * Math.PI) / 180;

export function rotatedBounds(box: Size, deg: number): Size {
  const c = Math.abs(Math.cos(rad(deg)));
  const s = Math.abs(Math.sin(rad(deg)));
  return {
    width: box.width * c + box.height * s,
    height: box.width * s + box.height * c,
  };
}

/** Origin (bottom-left before rotation) that puts the rotated box's centre at `center`. */
export function rotatedOrigin(center: Point, box: Size, deg: number): Point {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return {
    x: center.x - ((box.width / 2) * c - (box.height / 2) * s),
    y: center.y - ((box.width / 2) * s + (box.height / 2) * c),
  };
}

/** Visual origin for a box rotated `deg` whose bounding box sits at `anchor`. */
export function anchoredOrigin(
  visual: Size,
  anchor: Anchor,
  box: Size,
  deg: number,
  margin: number,
): Point {
  const bounds = rotatedBounds(box, deg);
  const at = placeBox(visual, anchor, bounds, margin);
  return rotatedOrigin(
    { x: at.x + bounds.width / 2, y: at.y + bounds.height / 2 },
    box,
    deg,
  );
}

export function selectPages(
  selection: PageSelection,
  pageCount: number,
): number[] {
  if (selection.mode === 'all')
    return Array.from({ length: pageCount }, (_, i) => i);
  return [
    ...new Set(rangesToIndices(parsePageRanges(selection.text, pageCount))),
  ].sort((a, b) => a - b);
}
