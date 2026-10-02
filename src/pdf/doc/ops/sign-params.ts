import { ToolError } from '@/shared/lib/errors';
import type { BlockContent } from '@/pdf/sign/block';
import type { SignatureFontId } from '@/pdf/sign/fonts';
import type { InkVector } from '@/pdf/sign/ink';
import type { AssetId, Box, PageId } from '../types';
import { asRecord, box, ids, str } from './validate';

/*
 * Parameter shapes and validators of the signing ops: a placed signature,
 * a signature block and initials on several pages (plans C-10, H-2, H-3,
 * H-7). Validators run on dispatch and on autosave restore.
 */

export type SignatureContent =
  | { kind: 'image'; assetId: AssetId; mime: 'image/png' | 'image/jpeg' }
  | {
      kind: 'text';
      text: string;
      fontId: SignatureFontId;
      /** The font file, stored as an asset so the writer never fetches. */
      fontAsset: AssetId;
      color: string;
      /** Degrees, -20..20; positive leans right. */
      slant?: number;
      /** Points, or 'fit' (the default): as large as the box allows. */
      size?: 'fit' | number;
    }
  /** Pen strokes as one filled path (nonzero). */
  | { kind: 'ink'; vector: InkVector; color: string }
  /** A photo traced to outlines (even-odd, so holes stay open). */
  | { kind: 'trace'; vector: InkVector; color: string };

export interface SignPlaceParams {
  id: string;
  pageId: PageId;
  rect: Box;
  rotate: number;
  content: SignatureContent;
  role: 'signature' | 'initials';
}

export type { BlockContent };

/** A signature with printed name, title and date stacked under it. */
export interface SignBlockParams {
  id: string;
  pageId: PageId;
  rect: Box;
  rotate: number;
  content: BlockContent;
}

/**
 * The same spot on each page, as fractions of that page's view box:
 * `fx`/`fy` from its left and bottom edges, `fw`/`fh` of its width and height.
 */
export interface PageAnchor {
  fx: number;
  fy: number;
  fw: number;
  fh: number;
}

export interface SignInitialPagesParams {
  id: string;
  pageIds: PageId[];
  anchor: PageAnchor;
  content: SignatureContent;
}

export const SIGNATURE_FONT_IDS: readonly SignatureFontId[] = [
  'dancing-script',
  'great-vibes',
  'caveat',
  'sacramento',
  'allura',
  'alex-brush',
  'parisienne',
  'pinyon-script',
  'mr-dafoe',
  'kristi',
];

/** Longest vector path accepted (characters of path data). */
export const MAX_PATH_LENGTH = 200_000;
const MAX_TEXT = 200;

const bad = (m: string) => new ToolError('INVALID_INPUT', m);
const HEX = /^#[0-9a-f]{6}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const oneOf = <T extends string>(
  v: unknown,
  list: readonly T[],
  what: string,
): T => {
  if (!list.includes(v as T)) throw bad(`${what}: unknown value`);
  return v as T;
};
const finite = (v: unknown, what: string): number => {
  if (typeof v !== 'number' || !Number.isFinite(v))
    throw bad(`${what}: expected a number`);
  return v;
};
const ink = (v: unknown, what: string): string => {
  if (typeof v !== 'string' || !HEX.test(v))
    throw bad(`${what}: bad ink colour`);
  return v;
};
const text = (v: unknown, what: string): string => {
  if (typeof v !== 'string' || v.length > MAX_TEXT)
    throw bad(`${what}: expected text of at most ${MAX_TEXT} characters`);
  return v;
};

function inkVector(v: unknown, what: string): InkVector {
  const o = asRecord(v, what);
  if (typeof o.d !== 'string' || !o.d || o.d.length > MAX_PATH_LENGTH)
    throw bad(`${what}: the drawing is empty or too detailed`);
  const [width, height] = [o.width, o.height];
  if (
    !(typeof width === 'number' && width > 0 && Number.isFinite(width)) ||
    !(typeof height === 'number' && height > 0 && Number.isFinite(height))
  )
    throw bad(`${what}: the drawing has no size`);
  return { d: o.d, width, height };
}

export function signatureContent(v: unknown): SignatureContent {
  const what = 'Signature';
  const o = asRecord(v, what);
  if (o.kind === 'image')
    return {
      kind: 'image',
      assetId: str(o.assetId, what),
      mime: oneOf(o.mime, ['image/png', 'image/jpeg'] as const, what),
    };
  if (o.kind === 'ink' || o.kind === 'trace')
    return {
      kind: o.kind,
      vector: inkVector(o.vector, what),
      color: ink(o.color, what),
    };
  if (o.kind === 'text') {
    const t = typeof o.text === 'string' ? o.text.trim() : '';
    if (!t) throw bad('Type your name');
    const slant = o.slant === undefined ? undefined : finite(o.slant, what);
    if (slant !== undefined && Math.abs(slant) > 20)
      throw bad(`${what}: the slant must be between -20 and 20 degrees`);
    if (
      o.size !== undefined &&
      o.size !== 'fit' &&
      !(typeof o.size === 'number' && o.size >= 4 && o.size <= 200)
    )
      throw bad(`${what}: the size must be between 4 and 200 points`);
    return {
      kind: 'text',
      text: t,
      fontId: oneOf(o.fontId, SIGNATURE_FONT_IDS, what),
      fontAsset: str(o.fontAsset, what),
      color: ink(o.color, what),
      ...(slant ? { slant } : {}),
      ...(o.size !== undefined ? { size: o.size as 'fit' | number } : {}),
    };
  }
  throw bad(`${what}: unknown kind`);
}

/** Asset ids a signature needs at export (vectors carry their own data). */
export const signatureAssets = (c: SignatureContent): AssetId[] =>
  c.kind === 'image' ? [c.assetId] : c.kind === 'text' ? [c.fontAsset] : [];

export function signPlaceParams(p: unknown): SignPlaceParams {
  const what = 'Place signature';
  const o = asRecord(p, what);
  return {
    id: str(o.id, what),
    pageId: str(o.pageId, what),
    rect: box(o.rect, what),
    rotate: finite(o.rotate ?? 0, what),
    content: signatureContent(o.content),
    role: oneOf(o.role, ['signature', 'initials'] as const, what),
  };
}

function blockContent(v: unknown): BlockContent {
  const what = 'Signature block';
  const o = asRecord(v, what);
  if (typeof o.dateIso !== 'string' || !ISO_DATE.test(o.dateIso))
    throw bad(`${what}: expected a date`);
  const locale = str(o.locale, what);
  try {
    new Intl.DateTimeFormat(locale);
  } catch {
    throw bad(`${what}: unknown date format`);
  }
  return {
    signature: signatureContent(o.signature),
    name: text(o.name, what),
    title: text(o.title, what),
    dateIso: o.dateIso,
    locale,
    showDate: o.showDate === true,
  };
}

export function signBlockParams(p: unknown): SignBlockParams {
  const what = 'Place signature block';
  const o = asRecord(p, what);
  return {
    id: str(o.id, what),
    pageId: str(o.pageId, what),
    rect: box(o.rect, what),
    rotate: finite(o.rotate ?? 0, what),
    content: blockContent(o.content),
  };
}

function pageAnchor(v: unknown, what: string): PageAnchor {
  const o = asRecord(v, what);
  const [fx, fy, fw, fh] = [o.fx, o.fy, o.fw, o.fh].map((n) => finite(n, what));
  const EPS = 1e-6;
  if (
    fx < 0 ||
    fy < 0 ||
    fw <= 0 ||
    fh <= 0 ||
    fx + fw > 1 + EPS ||
    fy + fh > 1 + EPS
  )
    throw bad(`${what}: the spot must be on the page`);
  return { fx, fy, fw, fh };
}

export function signInitialPagesParams(p: unknown): SignInitialPagesParams {
  const what = 'Initial pages';
  const o = asRecord(p, what);
  return {
    id: str(o.id, what),
    pageIds: ids(o.pageIds, what),
    anchor: pageAnchor(o.anchor, what),
    content: signatureContent(o.content),
  };
}
