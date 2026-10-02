import { ToolError } from '@/shared/lib/errors';
import type { AssetId, Box, OpId, PageId } from '../types';
import type { StampPreset } from '@/pdf/edit/annot/presets';
import { asRecord, box, str } from './validate';

/** UL, UR, LL, LR (PDF QuadPoints order), page space. */
export type Quad = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];
export type Point = [number, number];
export type MarkupSubtype =
  | 'Highlight'
  | 'Underline'
  | 'StrikeOut'
  | 'Squiggly';
export {
  STAMP_LABELS,
  STAMP_NAMES,
  STAMP_PRESETS,
  type StampPreset,
} from '@/pdf/edit/annot/presets';

/** A pending annotation (by its op id) or one already in the file (pdf.js id). */
export type AnnotTarget =
  | { kind: 'pending'; id: OpId }
  | { kind: 'existing'; ref: string; nm: string | null; index: number };

export interface AnnotPatch {
  rect?: Box;
  /** The listed rect a move of an existing annotation started from. */
  from?: Box;
  color?: string;
  contents?: string;
  opacity?: number;
}

export interface MarkupParams {
  id: string;
  pageId: PageId;
  subtype: MarkupSubtype;
  quads: Quad[];
  color: string;
  opacity: number;
  author: string;
  contents: string;
}
export interface NoteParams {
  id: string;
  pageId: PageId;
  at: Point;
  icon: 'Comment' | 'Note';
  color: string;
  author: string;
  contents: string;
  replyTo?: { kind: 'pending'; id: OpId } | { kind: 'existing'; ref: string };
}
export interface FreeTextParams {
  id: string;
  pageId: PageId;
  rect: Box;
  text: string;
  fontSize: number;
  color: string;
  align: 'left' | 'center' | 'right';
  border: boolean;
  author: string;
}
export interface InkParams {
  id: string;
  pageId: PageId;
  strokes: Point[][];
  width: number;
  color: string;
  opacity: number;
  author: string;
}
export interface ShapeParams {
  id: string;
  pageId: PageId;
  kind: 'Square' | 'Circle';
  rect: Box;
  width: number;
  color: string;
  fill: string | null;
  author: string;
}
export interface LineParams {
  id: string;
  pageId: PageId;
  from: Point;
  to: Point;
  width: number;
  color: string;
  arrowEnd: boolean;
  author: string;
}
export interface StampParams {
  id: string;
  pageId: PageId;
  rect: Box;
  preset?: StampPreset;
  label?: string;
  image?: { assetId: AssetId; mime: 'image/png' | 'image/jpeg' };
  color: string;
  author: string;
}
export interface DeleteParams {
  pageId: PageId;
  target: AnnotTarget;
}
export interface UpdateParams {
  pageId: PageId;
  target: AnnotTarget;
  patch: AnnotPatch;
}

const bad = (m: string) => new ToolError('INVALID_INPUT', m);

export const hex = (v: unknown, what: string): string => {
  if (typeof v !== 'string' || !/^#[0-9a-f]{6}$/i.test(v))
    throw bad(`${what}: the colour must look like #336699`);
  return v.toLowerCase();
};
export const opacity = (v: unknown, what: string): number => {
  if (typeof v !== 'number' || !(v >= 0 && v <= 1))
    throw bad(`${what}: opacity must be between 0 and 1`);
  return v;
};
export const text = (v: unknown, what: string, max = 10_000): string => {
  if (typeof v !== 'string' || v.length > max)
    throw bad(`${what}: expected text`);
  return v;
};
export const num = (v: unknown, what: string, min: number, max: number) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max)
    throw bad(`${what}: expected a number between ${min} and ${max}`);
  return v;
};
export const point = (v: unknown, what: string): Point => {
  if (
    !Array.isArray(v) ||
    v.length !== 2 ||
    !v.every((n) => typeof n === 'number' && Number.isFinite(n))
  )
    throw bad(`${what}: expected a point`);
  return [v[0], v[1]];
};
export const quads = (v: unknown, what: string): Quad[] => {
  if (
    !Array.isArray(v) ||
    v.length === 0 ||
    !v.every(
      (q) =>
        Array.isArray(q) &&
        q.length === 8 &&
        q.every((n) => typeof n === 'number' && Number.isFinite(n)),
    )
  )
    throw bad(`${what}: select some text first`);
  return v.map((q) => [...q] as Quad);
};
export const oneOf = <T extends string>(
  v: unknown,
  options: readonly T[],
  what: string,
): T => {
  if (!options.includes(v as T)) throw bad(`${what}: unknown choice`);
  return v as T;
};

export function target(v: unknown, what: string): AnnotTarget {
  const o = asRecord(v, what);
  if (o.kind === 'pending') return { kind: 'pending', id: str(o.id, what) };
  if (o.kind === 'existing') {
    if (o.nm !== null && typeof o.nm !== 'string')
      throw bad(`${what}: bad annotation name`);
    if (!Number.isInteger(o.index) || (o.index as number) < 0)
      throw bad(`${what}: bad annotation position`);
    return {
      kind: 'existing',
      ref: str(o.ref, what),
      nm: o.nm as string | null,
      index: o.index as number,
    };
  }
  throw bad(`${what}: unknown annotation`);
}

export function patch(v: unknown, what: string): AnnotPatch {
  const o = asRecord(v, what);
  const out: AnnotPatch = {};
  if (o.rect !== undefined) out.rect = box(o.rect, what);
  if (o.from !== undefined) out.from = box(o.from, what);
  if (o.color !== undefined) out.color = hex(o.color, what);
  if (o.contents !== undefined) out.contents = text(o.contents, what);
  if (o.opacity !== undefined) out.opacity = opacity(o.opacity, what);
  if (Object.keys(out).filter((k) => k !== 'from').length === 0)
    throw bad(`${what}: nothing to change`);
  return out;
}

/** The common fields every new annotation op carries. */
export function common(o: Record<string, unknown>, what: string) {
  return {
    id: str(o.id, what),
    pageId: str(o.pageId, what),
    color: hex(o.color, what),
    author: text(o.author, what, 200),
  };
}
