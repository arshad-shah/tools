import { ToolError } from '@/shared/lib/errors';
import type { LabelContext } from '../registry';
import type { Box, PageId } from '../types';

const bad = (message: string) => new ToolError('INVALID_INPUT', message);

export const plural = (n: number, one: string, many = `${one}s`) =>
  n === 1 ? one : many;

/** "page 3" for one page, "3 pages" for several. */
export const pageList = (ids: readonly PageId[], ctx: LabelContext) =>
  ids.length === 1
    ? `page ${ctx.pageNumber(ids[0]) ?? '?'}`
    : `${ids.length} pages`;

export const asRecord = (p: unknown, what: string): Record<string, unknown> => {
  if (typeof p !== 'object' || p === null || Array.isArray(p))
    throw bad(`${what}: expected settings`);
  return p as Record<string, unknown>;
};

/** A non-empty list of distinct strings. */
export const ids = (v: unknown, what: string): PageId[] => {
  if (
    !Array.isArray(v) ||
    v.length === 0 ||
    !v.every((x) => typeof x === 'string' && x.length > 0) ||
    new Set(v).size !== v.length
  )
    throw bad(`${what}: expected page ids`);
  return v as PageId[];
};

export const str = (v: unknown, what: string): string => {
  if (typeof v !== 'string' || v.length === 0)
    throw bad(`${what}: expected an id`);
  return v;
};

export const int = (v: unknown, what: string, min = 0): number => {
  if (!Number.isInteger(v) || (v as number) < min)
    throw bad(`${what}: expected a whole number of at least ${min}`);
  return v as number;
};

/** Page sizes in points: positive, at most 14400 (the PDF user-unit limit). */
export const size = (v: unknown, what: string): number => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0 || v > 14400)
    throw bad(`${what} must be between 0 and 14400 points`);
  return v;
};

export const box = (v: unknown, what: string): Box => {
  const o = asRecord(v, what);
  const [x, y, width, height] = [o.x, o.y, o.width, o.height];
  if (
    ![x, y, width, height].every(
      (n) => typeof n === 'number' && Number.isFinite(n),
    ) ||
    (width as number) <= 0 ||
    (height as number) <= 0
  )
    throw bad(`${what}: the area must have a width and a height`);
  return {
    x: x as number,
    y: y as number,
    width: width as number,
    height: height as number,
  };
};
