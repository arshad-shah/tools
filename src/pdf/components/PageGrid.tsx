import React from 'react';
import { cn } from '@/shared/lib/cn';
import { AutoGrid, Checkbox } from '@/shared/ui';
import type { DocInfo } from '@/pdf/render';
import type { Rotation } from '@/pdf/edit';
import { PageThumb } from './PageThumb';
import { useKeyboardReorder, useSortableList } from './useSortableList';

/** True when the event came from a nested control rather than the tile. */
const fromNestedControl = (e: React.SyntheticEvent<HTMLElement>) =>
  e.target !== e.currentTarget &&
  e.target instanceof Element &&
  e.target.closest('button, a, input, select, textarea, [role=button]') !==
    null;

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
  /** Present → tiles can be dragged, or moved with Alt + arrow keys. */
  onReorder?: (next: PageTile[]) => void;
  /**
   * Per-tile controls. Give every focusable control `ctx.tabIndex`: only the
   * active tile's controls are in the Tab order (roving tabindex).
   */
  renderActions?: (
    tile: PageTile,
    position: number,
    ctx: { tabIndex: 0 | -1 },
  ) => React.ReactNode;
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
  const keyboard = useKeyboardReorder(tiles, {
    getKey: (t) => t.key,
    describe: (t) => `page ${t.pageIndex + 1}`,
    onReorder: (next) => onReorder?.(next),
    axis: 'grid',
    disabled: !onReorder,
    roving: true,
  });

  return (
    <>
      <AutoGrid
        as="ul"
        ref={sortRef}
        aria-label={onReorder ? 'Pages (Alt + arrow keys to reorder)' : 'Pages'}
        min={thumbWidth + 24}
        gap="4"
      >
        {tiles.map((tile, position) => {
          const isSelected = selected?.has(tile.key) ?? false;
          const tabIndex = keyboard.tabIndexFor(tile.key);
          const n = tile.pageIndex + 1;
          return (
            <li
              key={tile.key}
              ref={keyboard.itemRef(tile.key)}
              data-sortable-item
              tabIndex={tabIndex}
              onFocus={() => keyboard.onItemFocus(tile.key)}
              // The original number is the page's identity; the position
              // says where it sits now (they differ after a reorder).
              aria-label={`Page ${n}, position ${position + 1}`}
              onClick={(e) => {
                if (fromNestedControl(e)) return;
                onToggle?.(tile.key, {
                  shift: e.shiftKey,
                  meta: e.metaKey || e.ctrlKey,
                });
              }}
              onKeyDown={(e) => {
                keyboard.onItemKeyDown(e, position);
                if (e.defaultPrevented || e.target !== e.currentTarget) return;
                if (onToggle && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onToggle(tile.key, {
                    shift: e.shiftKey,
                    meta: e.metaKey || e.ctrlKey,
                  });
                }
              }}
              className={cn(
                'flex flex-col items-center gap-2 rounded-md border p-3 outline-none focus-visible:ring-2 focus-visible:ring-focus',
                onReorder && 'cursor-grab',
                isSelected
                  ? 'border-accent-indicator bg-accent-soft'
                  : 'border-line hover:border-line-strong',
              )}
            >
              <PageThumb
                docId={doc.docId}
                pageIndex={tile.pageIndex}
                page={doc.pages[tile.pageIndex]}
                width={thumbWidth}
                rotation={tile.rotation}
                label={`Page ${n}`}
              />
              <div className="flex w-full items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  {onToggle && (
                    // Tiles hold buttons, so they can't be listbox options:
                    // a real checkbox carries the selection semantics.
                    <Checkbox
                      size="sm"
                      aria-label={`Select page ${n}`}
                      checked={isSelected}
                      tabIndex={tabIndex}
                      onCheckedChange={(_, e) =>
                        onToggle(tile.key, { shift: e.shiftKey, meta: true })
                      }
                    />
                  )}
                  <span className="font-mono text-xs text-fg-muted">{n}</span>
                </span>
                {renderActions?.(tile, position, { tabIndex })}
              </div>
            </li>
          );
        })}
      </AutoGrid>
      <p aria-live="polite" className="sr-only">
        {keyboard.announcement}
      </p>
    </>
  );
};
