import { useCallback, useMemo } from 'react';
import { VirtualList, type VirtualListHandle } from '@/shared/ui';
import type { FieldFilter } from '../lib/filter';
import type { LogEntry } from '../lib/model';
import type { SearchSpec } from '../lib/search-ranges';
import { EntryRow } from './EntryRow';

export interface LogListProps {
  total: number;
  entryAt(i: number): LogEntry | undefined;
  onRangeChange(start: number, end: number): void;
  expanded: ReadonlySet<number>;
  onToggle(index: number): void;
  selected: ReadonlyMap<number, LogEntry>;
  onSelect(entry: LogEntry, selected: boolean): void;
  onFieldFilter(f: FieldFilter): void;
  onActiveChange(position: number): void;
  wrap: boolean;
  search?: SearchSpec;
  listRef: React.Ref<VirtualListHandle>;
}

const ROW_HEIGHT = 30;

/**
 * The filtered entries as a virtual `role="log"` list. Rows are fetched by
 * position as they scroll into view; until then a placeholder shows.
 */
export function LogList({
  total,
  entryAt,
  onRangeChange,
  expanded,
  onToggle,
  selected,
  onSelect,
  onFieldFilter,
  onActiveChange,
  wrap,
  search,
  listRef,
}: LogListProps) {
  // A sparse array: the list renders by position and asks entryAt.
  const items = useMemo(() => new Array<undefined>(total), [total]);
  const full = selected.size >= 2;

  const rowProps = useCallback(
    (_: undefined, i: number) => {
      const e = entryAt(i);
      return {
        'aria-label': e ? `Line ${e.line}` : undefined,
        onKeyDown: (ev: React.KeyboardEvent<HTMLDivElement>) => {
          if (!e || ev.target !== ev.currentTarget) return;
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            onToggle(e.index);
          }
        },
      };
    },
    [entryAt, onToggle],
  );

  return (
    <VirtualList
      ref={listRef}
      role="log"
      ariaLabel="Log entries"
      items={items}
      estimateSize={ROW_HEIGHT}
      measure
      getKey={(_, i) => entryAt(i)?.index ?? `p${i}`}
      rowProps={rowProps}
      onRangeChange={onRangeChange}
      onActiveIndexChange={onActiveChange}
      className="h-[60vh] min-h-64 rounded-lg border border-line bg-surface"
      renderItem={(_, i) => {
        const e = entryAt(i);
        return (
          <EntryRow
            entry={e}
            expanded={e ? expanded.has(e.index) : false}
            onToggle={onToggle}
            selected={e ? selected.has(e.index) : false}
            selectable={!full}
            onSelect={onSelect}
            onFieldFilter={onFieldFilter}
            wrap={wrap}
            search={search}
          />
        );
      }}
    />
  );
}
