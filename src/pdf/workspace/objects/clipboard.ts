import type { NewOperation, Operation, PageId } from '@/pdf/doc/types';

/** Field id prefix of free Fill & Sign boxes (fill-sign/fields.ts FREE). */
const FREE_FIELD = 'free:';

/** Paste offset, points (right and down on an upright page). */
export const PASTE_OFFSET = 10;

export interface ObjectClipboard {
  copy(ops: readonly Operation[]): void;
  /** Copies of the copied objects on `pageId`, with new ids, offset by 10pt. */
  paste(pageId: PageId): NewOperation[];
  readonly size: number;
}

type Pt = [number, number];
const shift = ([x, y]: Pt, d: number): Pt => [x + d, y - d];

/** Moves every geometry field an object op carries by `d` right and `d` down. */
export function offsetParams(
  params: Record<string, unknown>,
  d: number,
): Record<string, unknown> {
  const p: Record<string, unknown> = { ...params };
  if (p.rect) {
    const r = p.rect as { x: number; y: number; width: number; height: number };
    p.rect = { ...r, x: r.x + d, y: r.y - d };
  }
  if (Array.isArray(p.at)) p.at = shift(p.at as Pt, d);
  if (Array.isArray(p.quads))
    p.quads = (p.quads as number[][]).map((q) =>
      q.map((v, i) => (i % 2 === 0 ? v + d : v - d)),
    );
  if (Array.isArray(p.strokes))
    p.strokes = (p.strokes as Pt[][]).map((s) => s.map((pt) => shift(pt, d)));
  // Annotation lines store page-space ends; content shapes store fractions of rect.
  if (!('kind' in p && (p.kind === 'line' || p.kind === 'arrow'))) {
    if (Array.isArray(p.from)) p.from = shift(p.from as Pt, d);
    if (Array.isArray(p.to)) p.to = shift(p.to as Pt, d);
  }
  return p;
}

/** In-memory copy and paste of overlay objects within the document. */
export function createObjectClipboard(newId: () => string): ObjectClipboard {
  let held: { type: string; params: Record<string, unknown> }[] = [];
  let pastes = 0;
  return {
    copy(ops) {
      held = ops.map((o) => ({
        type: o.type,
        params: structuredClone(o.params) as Record<string, unknown>,
      }));
      pastes = 0;
    },
    paste(pageId) {
      pastes += 1;
      return held.map((h) => {
        const params: Record<string, unknown> = {
          ...offsetParams(h.params, PASTE_OFFSET * pastes),
          id: newId(),
          pageId,
        };
        // A free Fill & Sign box is its own field: a copy that shared the
        // id would supersede the original.
        if (
          typeof params.fieldId === 'string' &&
          params.fieldId.startsWith(FREE_FIELD)
        )
          params.fieldId = `${FREE_FIELD}${newId()}`;
        return { type: h.type, params };
      });
    },
    get size() {
      return held.length;
    },
  };
}
