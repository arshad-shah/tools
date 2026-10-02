import { readingOrder } from '@/pdf/detect';
import type { ViewField } from './fields';

/** Text line height used to band rows when no better measure is known. */
const LINE_HEIGHT = 12;

/**
 * Fields in Tab order (spec §8.5): by page, then row bands, then x.
 * Suggested fields are left out until accepted (spec §8.4).
 */
export function tabOrder(fields: readonly ViewField[]): ViewField[] {
  const inOrder = fields.filter((f) => f.status === 'field');
  return readingOrder(
    inOrder.map((f) => ({ pageNumber: f.pageNumber, rect: f.rect })),
    LINE_HEIGHT,
  ).map((i) => inOrder[i]);
}

/** The next (or previous) empty field after `fromKey`, wrapping around. */
export function nextEmpty(
  order: readonly ViewField[],
  fromKey: string | null,
  dir: 1 | -1 = 1,
): ViewField | null {
  const empty = (f: ViewField) => !f.filled;
  if (order.length === 0) return null;
  const at = fromKey ? order.findIndex((f) => f.key === fromKey) : -1;
  for (let step = 1; step <= order.length; step++) {
    const i =
      at < 0
        ? dir === 1
          ? step - 1
          : order.length - step
        : (at + dir * step + order.length * 2) % order.length;
    if (empty(order[i])) return order[i];
  }
  return null;
}

/** The field after (or before) `fromKey` in Tab order, empty or not. */
export function step(
  order: readonly ViewField[],
  fromKey: string | null,
  dir: 1 | -1,
): ViewField | null {
  if (order.length === 0) return null;
  const at = fromKey ? order.findIndex((f) => f.key === fromKey) : -1;
  const i = at < 0 ? (dir === 1 ? 0 : order.length - 1) : at + dir;
  return order[i] ?? null;
}
