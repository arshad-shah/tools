import React from 'react';
import { GripVertical, X } from 'lucide-react';
import { IconButton } from '@/shared/ui';
import { formatBytes } from '@/shared/lib/format';
import { useSortableList } from './useSortableList';

interface FileItem {
  id: string;
  name: string;
  size: number;
}

interface SortableFileListProps<T extends FileItem> {
  items: T[];
  onReorder: (next: T[]) => void;
  onRemove: (id: string) => void;
  /** Visual preview (e.g. `<FileThumb>`), shown in a fixed-width first column. */
  renderPreview?: (item: T) => React.ReactNode;
  renderExtra?: (item: T) => React.ReactNode;
}

export function SortableFileList<T extends FileItem>({
  items,
  onReorder,
  onRemove,
  renderPreview,
  renderExtra,
}: SortableFileListProps<T>) {
  const ref = useSortableList(items, onReorder, { direction: 'y' });
  return (
    <ol
      ref={ref}
      aria-label="Files (drag or use Space + arrows to reorder)"
      className="flex flex-col gap-2"
    >
      {items.map((item, i) => (
        <li
          key={item.id}
          data-sortable-item
          tabIndex={0}
          className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <GripVertical
            size={16}
            className="shrink-0 cursor-grab text-fg-faint"
            aria-hidden
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
            icon={<X size={16} />}
            variant="ghost"
            size="sm"
            onClick={() => onRemove(item.id)}
          />
        </li>
      ))}
    </ol>
  );
}
