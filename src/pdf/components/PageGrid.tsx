import React from 'react';
import { cn } from '@/lib/utils';
import type { DocInfo } from '@/pdf/render';
import type { Rotation } from '@/pdf/edit';
import { PageThumb } from './PageThumb';
import { useSortableList } from './useSortableList';

export interface PageTile {
  /** Stable identity across reorders. */
  key: string;
  pageIndex: number;
  rotation: Rotation;
}

interface PageGridProps {
  doc: DocInfo;
  tiles: PageTile[];
  thumbWidth?: number;
  selected?: ReadonlySet<string>;
  onToggle?: (key: string, mods: { shift: boolean; meta: boolean }) => void;
  /** Present → tiles can be dragged, or lifted with Space and moved with arrows. */
  onReorder?: (next: PageTile[]) => void;
  renderActions?: (tile: PageTile, position: number) => React.ReactNode;
}

export const PageGrid: React.FC<PageGridProps> = ({
  doc,
  tiles,
  thumbWidth = 140,
  selected,
  onToggle,
  onReorder,
  renderActions,
}) => {
  const sortRef = useSortableList(tiles, (next) => onReorder?.(next), {
    disabled: !onReorder,
    direction: 'grid',
  });

  return (
    <ul
      ref={sortRef}
      aria-label="Pages"
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${thumbWidth + 24}px, 1fr))`,
      }}
    >
      {tiles.map((tile, position) => {
        const isSelected = selected?.has(tile.key) ?? false;
        return (
          <li
            key={tile.key}
            data-sortable-item
            tabIndex={0}
            aria-selected={onToggle ? isSelected : undefined}
            onClick={(e) =>
              onToggle?.(tile.key, {
                shift: e.shiftKey,
                meta: e.metaKey || e.ctrlKey,
              })
            }
            onKeyDown={(e) => {
              // Space belongs to detent's keyboard reordering when sortable.
              if (
                onToggle &&
                (e.key === 'Enter' || (!onReorder && e.key === ' '))
              ) {
                e.preventDefault();
                onToggle(tile.key, {
                  shift: e.shiftKey,
                  meta: e.metaKey || e.ctrlKey,
                });
              }
            }}
            className={cn(
              'flex flex-col items-center gap-2 rounded-md border p-3 outline-none focus-visible:ring-2 focus-visible:ring-accent',
              onReorder && 'cursor-grab',
              isSelected
                ? 'border-accent bg-accent/5'
                : 'border-line hover:border-line-strong',
            )}
          >
            <PageThumb
              docId={doc.docId}
              pageIndex={tile.pageIndex}
              page={doc.pages[tile.pageIndex]}
              width={thumbWidth}
              rotation={tile.rotation}
              label={`Page ${tile.pageIndex + 1}`}
            />
            <div className="flex w-full items-center justify-between gap-2">
              <span className="font-mono text-xs text-fg-muted">
                {tile.pageIndex + 1}
              </span>
              {renderActions?.(tile, position)}
            </div>
          </li>
        );
      })}
    </ul>
  );
};
