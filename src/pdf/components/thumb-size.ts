import type { Rotation } from '@/pdf/edit';
import type { PageInfo } from '@/pdf/render';

/**
 * Box sizes for a page thumbnail `width` CSS px wide. The outer box is tall
 * enough for either orientation, so tiles don't jump when rotated. On a
 * quarter turn the inner (unrotated) box shrinks so its height, which
 * becomes the visual width, still fits `width`.
 */
export function thumbBoxSize(
  page: Pick<PageInfo, 'width' | 'height'>,
  width: number,
  rotation: Rotation,
): { outerHeight: number; innerWidth: number } {
  const ratio = page.height / page.width;
  const outerHeight = width * Math.max(ratio, 1 / ratio);
  const quarter = rotation === 90 || rotation === 270;
  const innerWidth = quarter ? Math.min(width, width / ratio) : width;
  return { outerHeight, innerWidth };
}
