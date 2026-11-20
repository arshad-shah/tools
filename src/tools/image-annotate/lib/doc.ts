import {
  flipPointH,
  flipPointV,
  mapRect,
  orientedSize,
  turnPointCcw,
  turnPointCw,
  type Point,
  type Quarter,
  type Rect,
  type Size,
} from './geometry';
import { mapObject, moveObject, type AnnotObject } from './model';

/**
 * The editing document: how the source image is oriented and cropped, and
 * the objects drawn on the result. Immutable; every edit returns a new doc,
 * so undo is a list of docs.
 */
export interface Doc {
  /** Source image size, never changes. */
  source: Size;
  /** Quarter turns clockwise, applied first. */
  turns: Quarter;
  /** Mirror left to right, applied after the turns. */
  flip: boolean;
  /** The kept part of the oriented image. */
  crop: Rect;
  /** Drawn in order, in crop coordinates (0,0 is the crop's corner). */
  objects: AnnotObject[];
}

export function newDoc(source: Size): Doc {
  return {
    source: { ...source },
    turns: 0,
    flip: false,
    crop: { x: 0, y: 0, ...source },
    objects: [],
  };
}

/** The oriented, uncropped size. */
export const fullSize = (d: Doc): Size => orientedSize(d.source, d.turns);

/** The edited image's size (the crop). */
export const docSize = (d: Doc): Size => ({
  width: d.crop.width,
  height: d.crop.height,
});

type PointMap = (p: Point, size: Size) => Point;

/** One whole-image change applied to the crop (in full space) and objects. */
function reorient(d: Doc, map: PointMap, turns: Quarter, flip: boolean): Doc {
  const full = fullSize(d);
  const size = docSize(d);
  return {
    ...d,
    turns,
    flip,
    crop: mapRect(d.crop, (p) => map(p, full)),
    objects: d.objects.map((o) => mapObject(o, (p) => map(p, size))),
  };
}

const turn = (t: Quarter, by: number) => ((((t + by) % 4) + 4) % 4) as Quarter;

/*
 * Orientation is "turns, then mirror". Turning after a mirror is the
 * mirror after turning the other way, so a mirrored doc counts its turns
 * backwards; a vertical flip is a mirror plus a half turn.
 */

/** Turned a quarter clockwise (or anticlockwise). */
export function rotateDoc(d: Doc, dir: 'cw' | 'ccw'): Doc {
  const step = dir === 'cw' ? 1 : -1;
  return reorient(
    d,
    dir === 'cw' ? turnPointCw : turnPointCcw,
    turn(d.turns, d.flip ? -step : step),
    d.flip,
  );
}

/** Mirrored left to right ('h') or top to bottom ('v'). */
export function flipDoc(d: Doc, axis: 'h' | 'v'): Doc {
  return reorient(
    d,
    axis === 'h' ? flipPointH : flipPointV,
    axis === 'h' ? d.turns : turn(d.turns, 2),
    !d.flip,
  );
}

/**
 * Keeps `rect` (full oriented space, clamped to the image and rounded to
 * whole pixels); objects keep their place on the image.
 */
export function cropDoc(d: Doc, rect: Rect): Doc {
  const full = fullSize(d);
  const x = Math.max(0, Math.min(full.width - 1, Math.round(rect.x)));
  const y = Math.max(0, Math.min(full.height - 1, Math.round(rect.y)));
  const crop = {
    x,
    y,
    width: Math.max(1, Math.min(full.width - x, Math.round(rect.width))),
    height: Math.max(1, Math.min(full.height - y, Math.round(rect.height))),
  };
  const dx = d.crop.x - crop.x;
  const dy = d.crop.y - crop.y;
  return {
    ...d,
    crop,
    objects: d.objects.map((o) => moveObject(o, dx, dy)),
  };
}

export const addObject = (d: Doc, o: AnnotObject): Doc => ({
  ...d,
  objects: [...d.objects, o],
});

export const replaceObject = (d: Doc, o: AnnotObject): Doc => ({
  ...d,
  objects: d.objects.map((x) => (x.id === o.id ? o : x)),
});

export const removeObject = (d: Doc, id: string): Doc => ({
  ...d,
  objects: d.objects.filter((x) => x.id !== id),
});

/** Moves the object one place up or down the stack (or to an end). */
export function reorderObject(
  d: Doc,
  id: string,
  to: 'forward' | 'backward' | 'front' | 'back',
): Doc {
  const i = d.objects.findIndex((o) => o.id === id);
  if (i < 0) return d;
  const list = [...d.objects];
  const [o] = list.splice(i, 1);
  const j =
    to === 'front'
      ? list.length
      : to === 'back'
        ? 0
        : Math.max(0, Math.min(list.length, i + (to === 'forward' ? 1 : -1)));
  list.splice(j, 0, o);
  return { ...d, objects: list };
}
