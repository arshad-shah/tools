import type { LayerObject } from '@/shared/ui';
import type { Box, NewOperation, PageId } from '@/pdf/doc/types';
import type { ExistingAnnotation } from '@/pdf/render/annotations';

/*
 * Annotations already in the file on the shared object layer: selected,
 * moved and resized like placed objects, written as annot.update with a
 * new rect (the writer maps quad points, line ends and ink into it).
 */

const PREFIX = 'existing:';

export const existingId = (ref: string) => `${PREFIX}${ref}`;

export const refOfExisting = (id: string): string | null =>
  id.startsWith(PREFIX) ? id.slice(PREFIX.length) : null;

/** Notes are a fixed-size icon; text markup stays on its text. */
export function existingObject(
  a: ExistingAnnotation,
  label: string,
  box: Box = a.rect,
): LayerObject {
  return {
    id: existingId(a.ref),
    box,
    label,
    movable: !a.quadPoints,
    resizable: a.subtype !== 'Text',
  };
}

export function existingUpdate(
  pageId: PageId,
  a: ExistingAnnotation,
  rect: Box,
): NewOperation {
  return {
    type: 'annot.update',
    params: {
      pageId,
      target: { kind: 'existing', ref: a.ref, nm: null, index: a.index },
      patch: { rect },
    },
  };
}

/** The annotation as it shows in a new rect (quad points scaled along). */
export function movedAnnotation(
  a: ExistingAnnotation,
  rect: Box,
): ExistingAnnotation {
  const r = a.rect;
  const sx = r.width > 0 ? rect.width / r.width : 1;
  const sy = r.height > 0 ? rect.height / r.height : 1;
  return {
    ...a,
    rect,
    quadPoints: a.quadPoints
      ? a.quadPoints.map((v, i) =>
          i % 2 === 0 ? rect.x + (v - r.x) * sx : rect.y + (v - r.y) * sy,
        )
      : null,
  };
}
