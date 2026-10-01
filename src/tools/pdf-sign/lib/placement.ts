import type { VisualRect } from '@/pdf/edit';
import type { PageInfo } from '@/pdf/render';

export const MIN_SIZE_PT = 12;
const MARGIN = 36;

export function clampRect(r: VisualRect, page: PageInfo): VisualRect {
  const s = Math.min(1, page.width / r.width, page.height / r.height);
  const width = Math.max(MIN_SIZE_PT, r.width * s);
  const height = Math.max(MIN_SIZE_PT, r.height * s);
  return {
    width,
    height,
    x: Math.min(Math.max(r.x, 0), page.width - width),
    y: Math.min(Math.max(r.y, 0), page.height - height),
  };
}

export function defaultRect(page: PageInfo, aspect: number): VisualRect {
  const width = Math.min(page.width * 0.3, 220);
  const height = width / aspect;
  return clampRect(
    {
      x: page.width - MARGIN - width,
      y: page.height - MARGIN - height,
      width,
      height,
    },
    page,
  );
}

export const moveRect = (
  r: VisualRect,
  dx: number,
  dy: number,
  page: PageInfo,
) => clampRect({ ...r, x: r.x + dx, y: r.y + dy }, page);

export function scaleRect(
  r: VisualRect,
  factor: number,
  page: PageInfo,
): VisualRect {
  const width = r.width * factor;
  const height = r.height * factor;
  return clampRect(
    {
      x: r.x - (width - r.width) / 2,
      y: r.y - (height - r.height) / 2,
      width,
      height,
    },
    page,
  );
}

export const rectToPixels = (r: VisualRect, scale: number) => ({
  left: r.x * scale,
  top: r.y * scale,
  width: r.width * scale,
  height: r.height * scale,
});

export const rectFromPixels = (
  px: { left: number; top: number; width: number; height: number },
  scale: number,
  page: PageInfo,
) =>
  clampRect(
    {
      x: px.left / scale,
      y: px.top / scale,
      width: px.width / scale,
      height: px.height / scale,
    },
    page,
  );
