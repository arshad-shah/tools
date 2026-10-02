import type { Box } from '@/pdf/doc/types';
import { EDITABLE_SUBTYPES } from '@/pdf/edit/annot/subtypes';

/** An annotation already in the file, as the workspace lists it. */
export interface ExistingAnnotation {
  /** pdf.js id, e.g. "12R" or "12R3" (generation 3). */
  ref: string;
  subtype: string;
  rect: Box;
  /** '#rrggbb' or null. */
  color: string | null;
  author: string | null;
  contents: string | null;
  /** PDF date string as stored, or null. */
  modified: string | null;
  inReplyTo: string | null;
  quadPoints: number[] | null;
  /** The subtype is one the workspace writes, so it can be edited (spec §9.1). */
  editable: boolean;
  /** Position among the page's non-popup /Annots entries (used when a copied page renumbers refs). */
  index: number;
}

// pdf.js annotation data is loosely typed; only these fields are read.
interface RawAnnotation {
  id?: string;
  subtype?: string;
  rect?: ArrayLike<number>;
  color?: ArrayLike<number> | null;
  titleObj?: { str?: string };
  contentsObj?: { str?: string };
  modificationDate?: string | null;
  inReplyTo?: string | null;
  quadPoints?: ArrayLike<number> | null;
}

const hex = (c: ArrayLike<number>) =>
  `#${Array.from(c)
    .slice(0, 3)
    .map((v) => Math.round(v).toString(16).padStart(2, '0'))
    .join('')}`;

const orNull = (s: string | undefined) => (s ? s : null);

/** Maps pdf.js getAnnotations() output; Widgets and Popups are left out. */
export function toExistingAnnotations(
  raw: readonly RawAnnotation[],
): ExistingAnnotation[] {
  const out: ExistingAnnotation[] = [];
  // pdf.js lists popups last; the rest keep /Annots order.
  raw
    .filter((a) => a.subtype !== 'Popup')
    .forEach((a, index) => {
      if (!a.id || !a.subtype || a.subtype === 'Widget') return;
      const r = a.rect ? Array.from(a.rect) : [0, 0, 0, 0];
      out.push({
        ref: a.id,
        subtype: a.subtype,
        rect: { x: r[0], y: r[1], width: r[2] - r[0], height: r[3] - r[1] },
        color: a.color && a.color.length >= 3 ? hex(a.color) : null,
        author: orNull(a.titleObj?.str),
        contents: orNull(a.contentsObj?.str),
        modified: a.modificationDate ?? null,
        inReplyTo: a.inReplyTo ?? null,
        quadPoints: a.quadPoints ? Array.from(a.quadPoints) : null,
        editable: EDITABLE_SUBTYPES.has(a.subtype),
        index,
      });
    });
  return out;
}
