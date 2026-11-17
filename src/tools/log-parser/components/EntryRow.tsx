import { memo, useMemo } from 'react';
import {
  Badge,
  Checkbox,
  IconButton,
  Inline,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { chevronDown, chevronRight } from '@arshad-shah/cynosure/icons';

import type { FieldFilter } from '../lib/filter';
import { levelLabel, levelTone } from '../lib/level-style';
import type { LogEntry } from '../lib/model';
import { rowTime } from '../lib/progress';
import type { LogColumn } from '../settings';
import { searchRanges, type SearchSpec } from '../lib/search-ranges';
import { FieldTable } from './FieldTable';
import { CodeEditor } from '@/shared/editor';

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
  /** Summary columns shown (settings.columns). */
  columns: readonly LogColumn[];
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
  columns,
}: EntryRowProps) {
  const show = (c: LogColumn) => columns.includes(c);
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
      <Inline align="center" paddingInline="5" paddingBlock="2">
        <Text size="sm" tone="muted">
          Loading
        </Text>
      </Inline>
    );

  return (
    <Stack gap="2" paddingInline="4" paddingBlock="2">
      <Inline gap="4" align="start" wrap={false}>
        <Checkbox
          size="sm"
          checked={selected}
          disabled={!selected && !selectable}
          label={`Select line ${entry.line}`}
          labelHidden
          onChange={(v) => onSelect(entry, v)}
        />
        <IconButton
          size="sm"
          variant="ghost"
          tabIndex={-1}
          label={`${expanded ? 'Collapse' : 'Expand'} line ${entry.line}`}
          aria-expanded={expanded}
          icon={expanded ? chevronDown : chevronRight}
          onClick={() => onToggle(entry.index)}
        />
        {show('line') ? (
          <Inline data-column="line" shrink={false}>
            <Text variant="code" size="sm" tone="muted" numeric>
              {entry.line}
            </Text>
          </Inline>
        ) : null}
        {show('level') ? (
          <Inline data-column="level" shrink={false}>
            <Badge size="sm" variant="soft" tone={levelTone(entry.level)} dot>
              {levelLabel(entry.level)}
            </Badge>
          </Inline>
        ) : null}
        {show('time') && entry.ts !== undefined ? (
          <Inline data-column="time" shrink={false} hideBelow="md">
            <Text variant="code" size="sm" tone="muted" numeric>
              {rowTime(entry.ts)}
            </Text>
          </Inline>
        ) : null}
        {show('component') && entry.component ? (
          <Inline data-column="component" hideBelow="sm" minSize="0">
            <Text variant="code" size="sm" tone="info" truncate>
              {entry.component}
            </Text>
          </Inline>
        ) : null}
        <Stack grow minSize="0">
          <Text
            variant="code"
            size="sm"
            {...(wrap ? { wrap: 'break' as const } : { truncate: true })}
          >
            {first}
            {nl >= 0 && !expanded ? (
              <Text as="span" tone="muted">
                {' '}
                (more lines)
              </Text>
            ) : null}
          </Text>
        </Stack>
      </Inline>
      {expanded ? (
        <Stack gap="2" paddingInline="10">
          <CodeEditor
            value={entry.message}
            language="log"
            aria-label={`Line ${entry.line} message`}
            readOnly
            wrap={wrap}
            ranges={ranges}
            minHeight={0}
            maxHeight={240}
          />
          {entry.fields ? (
            <FieldTable fields={entry.fields} onFilter={onFieldFilter} />
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  );
});
