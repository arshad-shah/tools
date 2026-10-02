import type { Box } from '@/pdf/doc/types';
import type { PageTextItems } from '@/pdf/render';
import { intersects } from '@/pdf/redact/geometry';
import { pad, pageChars, union } from '@/pdf/redact/glyphs';

/**
 * "Snap to text lines": the drawn box becomes the union of the glyph boxes
 * it touches (padded 0.5pt), or stays as drawn over no text.
 */
export function snapToText(box: Box, items: PageTextItems): Box {
  const hit = pageChars(items)
    .filter((c) => c.box && c.ch.trim() !== '' && intersects(c.box, box))
    .map((c) => c.box!);
  return hit.length ? pad(union(hit), 0.5) : box;
}
