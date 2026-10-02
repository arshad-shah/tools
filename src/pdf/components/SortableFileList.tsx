import React from 'react';
import { IconGripVertical, IconX } from '@/shared/ui/icons';
import { IconButton } from '@/shared/ui';
import { formatBytes } from '@/shared/lib/format';
import { useKeyboardReorder, useSortableList } from './useSortableList';

interface FileItem {
  id: string;
  name: string;
  size: number;
}

interface SortableFileListProps<T extends FileItem> {
  items: T[];
  /** While true (e.g. a job is running) rows can't be moved or removed. */
  disabled?: boolean;
  onReorder: (next: T[]) => void;
  onRemove: (id: string) => void;
  /** Visual preview (e.g. `<FileThumb>`), shown in a fixed-width first column. */
  renderPreview?: (item: T) => React.ReactNode;
  renderExtra?: (item: T) => React.ReactNode;
}

/** Drag, or focus a row and press Alt + Up/Down, to reorder. */
export function SortableFileList<T extends FileItem>({
  items,
  disabled = false,
  onReorder,
  onRemove,
  renderPreview,
  renderExtra,
}: SortableFileListProps<T>) {
  const ref = useSortableList(items, onReorder, {
    direction: 'y',
    disabled,
  });
  const keyboard = useKeyboardReorder(items, {
    getKey: (item) => item.id,
    describe: (item) => item.name,
    onReorder,
    axis: 'list',
    disabled,
  });
  return (
    <>
      <ol
        ref={ref}
        aria-label="Files (Alt + arrow keys to reorder)"
        className="flex flex-col gap-2"
      >
        {items.map((item, i) => (
          <li
            key={item.id}
            ref={keyboard.itemRef(item.id)}
            data-sortable-item
            tabIndex={0}
            onKeyDown={(e) => keyboard.onItemKeyDown(e, i)}
            className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <IconGripVertical
              size="sm"
              className="shrink-0 cursor-grab text-fg-subtle"
            />
            {renderPreview && (
              <div className="flex w-14 shrink-0 items-center justify-center">
                {renderPreview(item)}
              </div>
            )}
            <span className="font-mono text-xs text-fg-subtle">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-fg">{item.name}</p>
              <p className="font-mono text-xs text-fg-muted">
                {formatBytes(item.size)}
              </p>
            </div>
            {renderExtra?.(item)}
            <IconButton
              label={`Remove ${item.name}`}
              icon={<IconX size="sm" />}
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => onRemove(item.id)}
            />
          </li>
        ))}
      </ol>
      <p aria-live="polite" className="sr-only">
        {keyboard.announcement}
      </p>
    </>
  );
}
