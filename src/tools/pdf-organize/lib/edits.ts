import type { PageEdit, Rotation } from '@/pdf/edit';
import type { PageTile } from '@/pdf/components';

export function initialTiles(pageCount: number): PageTile[] {
  return Array.from({ length: pageCount }, (_, i) => ({
    key: `p${i}`,
    pageIndex: i,
    rotation: 0,
  }));
}

export function rotateTiles(
  tiles: PageTile[],
  keys: ReadonlySet<string>,
  delta: 90 | -90,
): PageTile[] {
  return tiles.map((t) =>
    keys.has(t.key)
      ? {
          ...t,
          rotation: ((((t.rotation + delta) % 360) + 360) % 360) as Rotation,
        }
      : t,
  );
}

export function removeTiles(
  tiles: PageTile[],
  keys: ReadonlySet<string>,
): PageTile[] {
  return tiles.filter((t) => !keys.has(t.key));
}

export function tilesToEdits(tiles: PageTile[]): PageEdit[] {
  return tiles.map((t) => ({ source: t.pageIndex, rotate: t.rotation }));
}
