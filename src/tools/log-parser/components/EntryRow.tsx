import { memo, useMemo } from 'react';
import { cn } from '@/shared/lib/cn';
import { Checkbox, CodeSurface, IconButton, StatusDot } from '@/shared/ui';
import { IconChevronDown, IconChevronRight } from '@/shared/ui/icons';
import type { FieldFilter } from '../lib/filter';
import { levelLabel, levelTone } from '../lib/level-style';
import type { LogEntry } from '../lib/model';
import { rowTime } from '../lib/progress';
import { searchRanges, type SearchSpec } from '../lib/search-ranges';
import { FieldTable } from './FieldTable';

export interface EntryRowProps {
  entry: LogEntry | undefined;
  expanded: boolean;
  onToggle(index: number): void;
  selected: boolean;
  /** False when two other entries are already selected. */
  selectable: boolean;
  onSelect(entry: LogEntry, selected: boolean): void;
  onFieldFilter(f: FieldFilter): void;
  wrap: boolean;
  search?: SearchSpec;
}

/** One log entry in the list: summary line, expandable to its details. */
export const EntryRow = memo(function EntryRow({
  entry,
  expanded,
  onToggle,
  selected,
  selectable,
  onSelect,
  onFieldFilter,
  wrap,
  search,
}: EntryRowProps) {
  const nl = entry ? entry.message.indexOf('\n') : -1;
  const first = entry
    ? nl < 0
      ? entry.message
      : entry.message.slice(0, nl)
    : '';
  const ranges = useMemo(
    () => (expanded && entry ? searchRanges(entry.message, search) : []),
    [expanded, entry, search],
  );

  if (!entry)
    return (
      <div className="flex h-7 items-center px-3 text-sm text-fg-subtle">
        Loading
      </div>
    );

  return (
    <div
      className={cn(
        'border-b border-line px-2 py-1 text-sm',
        selected && 'bg-accent-soft',
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        <Checkbox
          size="sm"
          tabIndex={-1}
          checked={selected}
          disabled={!selected && !selectable}
          aria-label={`Select line ${entry.line}`}
          onCheckedChange={(v) => onSelect(entry, v)}
        />
        <IconButton
          size="sm"
          variant="ghost"
          tabIndex={-1}
          className="-my-1 size-6"
          label={`${expanded ? 'Collapse' : 'Expand'} line ${entry.line}`}
          aria-expanded={expanded}
          icon={expanded ? IconChevronDown : IconChevronRight}
          onClick={() => onToggle(entry.index)}
        />
        <span className="w-12 shrink-0 text-right font-mono text-fg-subtle tabular-nums">
          {entry.line}
        </span>
        <span className="flex w-20 shrink-0 items-center gap-1.5">
          <StatusDot tone={levelTone(entry.level)} decorative />
          <span className="text-fg-muted">{levelLabel(entry.level)}</span>
        </span>
        {entry.ts !== undefined ? (
          <span className="hidden shrink-0 font-mono text-fg-muted tabular-nums md:inline">
            {rowTime(entry.ts)}
          </span>
        ) : null}
        {entry.component ? (
          <span className="hidden max-w-48 shrink-0 truncate font-mono text-info sm:inline">
            {entry.component}
          </span>
        ) : null}
        <span
          className={cn(
            'min-w-0 flex-1 font-mono text-fg',
            wrap ? 'whitespace-pre-wrap break-all' : 'truncate whitespace-pre',
          )}
        >
          {first}
          {nl >= 0 && !expanded ? (
            <span className="text-fg-subtle"> (more lines)</span>
          ) : null}
        </span>
      </div>
      {expanded ? (
        <div className="mt-2 mb-1 flex flex-col gap-2 pl-14">
          <CodeSurface
            value={entry.message}
            language="log"
            label={`Line ${entry.line} message`}
            readOnly
            wrap={wrap}
            ranges={ranges}
            minHeight={0}
            maxHeight={240}
          />
          {entry.fields ? (
            <FieldTable fields={entry.fields} onFilter={onFieldFilter} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
