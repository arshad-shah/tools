import type { OverlayTransform } from '@/shared/ui';
import type { Box } from '@/pdf/doc/types';

/** A Popover anchor at a page-space box, measured from the overlay's element. */
export function boxAnchor(
  root: () => HTMLElement | null,
  t: OverlayTransform,
  box: Box,
) {
  return {
    getBoundingClientRect: () => {
      const r = root()?.getBoundingClientRect();
      const corners = [
        [box.x, box.y],
        [box.x + box.width, box.y + box.height],
      ].map(([x, y]) => [t.a * x + t.c * y + t.e, t.b * x + t.d * y + t.f]);
      const left = Math.min(corners[0][0], corners[1][0]);
      const top = Math.min(corners[0][1], corners[1][1]);
      return new DOMRect(
        (r?.left ?? 0) + left,
        (r?.top ?? 0) + top,
        Math.abs(corners[1][0] - corners[0][0]),
        Math.abs(corners[1][1] - corners[0][1]),
      );
    },
  };
}
