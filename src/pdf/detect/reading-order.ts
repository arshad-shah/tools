import type { Box } from '@/pdf/doc/types';

/**
 * Tab order (spec 8.5): by page, then row bands (single-linkage clusters of
 * top edges within half a line height, top to bottom), then x. Returns
 * indices into `fields`.
 */
export function readingOrder(
  fields: { pageNumber: number; rect: Box }[],
  lineHeight: number,
): number[] {
  const tol = 0.5 * lineHeight;
  const top = (k: number) => fields[k].rect.y + fields[k].rect.height;
  const byPage = new Map<number, number[]>();
  fields.forEach((f, k) => {
    const list = byPage.get(f.pageNumber);
    if (list) list.push(k);
    else byPage.set(f.pageNumber, [k]);
  });
  const out: number[] = [];
  for (const page of [...byPage.keys()].sort((a, b) => a - b)) {
    const ks = byPage.get(page)!.sort((a, b) => top(b) - top(a));
    let band: number[] = [];
    const flush = () => {
      band.sort((a, b) => fields[a].rect.x - fields[b].rect.x || a - b);
      out.push(...band);
      band = [];
    };
    for (const k of ks) {
      if (band.length && top(band[band.length - 1]) - top(k) > tol) flush();
      band.push(k);
    }
    flush();
  }
  return out;
}
