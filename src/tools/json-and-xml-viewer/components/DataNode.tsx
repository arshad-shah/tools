/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {
  IconChevronDown,
  IconChevronRight,
  IconCopy,
  IconLink2,
} from '@/shared/ui/icons';
import { IconButton, Indent, Tooltip } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';

/** Tree-row classes (formerly a CSS module). */
const styles = {
  row: 'group relative flex min-w-0 items-center gap-1.5 rounded py-0.5 pr-2 font-mono text-sm leading-[1.6]',
  rowIdle: 'hover:bg-surface-2',
  rowMatched: 'bg-warning',
  indentGuide: 'ml-[7px] w-4 border-l border-line',
  chevron:
    'size-[18px] shrink-0 rounded-[3px] text-fg-muted hover:bg-surface-3 hover:text-fg',
  chevronSpacer: 'w-[18px] shrink-0',
  key: 'font-medium whitespace-nowrap text-fg',
  colon: 'mr-0.5 text-fg-subtle',
  value: 'min-w-0 flex-auto truncate',
  string: 'text-accent-fg',
  number: 'text-info',
  boolean: 'font-semibold text-warning',
  null: 'italic text-fg-subtle',
  summary: 'text-[0.9em] italic text-fg-subtle',
  bracket: 'font-bold text-fg-muted',
  actions:
    'ml-auto flex shrink-0 gap-0.5 opacity-0 transition-opacity duration-[120ms] ease-[ease] group-hover:opacity-100 group-focus-within:opacity-100',
  actionBtn:
    'size-[22px] rounded-[3px] text-fg-subtle hover:bg-surface-3 hover:text-fg',
} as const;

type ValueKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'object'
  | 'array'
  | 'other';

const kindOf = (data: any): ValueKind => {
  if (data === null) return 'null';
  if (Array.isArray(data)) return 'array';
  if (typeof data === 'object') return 'object';
  if (typeof data === 'string') return 'string';
  if (typeof data === 'number') return 'number';
  if (typeof data === 'boolean') return 'boolean';
  return 'other';
};

const renderValue = (data: any, kind: ValueKind) => {
  switch (kind) {
    case 'string': {
      const display =
        data.length > 80 ? `"${data.slice(0, 80)}…"` : `"${data}"`;
      return <span className={styles.string}>{display}</span>;
    }
    case 'number':
      return <span className={styles.number}>{String(data)}</span>;
    case 'boolean':
      return <span className={styles.boolean}>{String(data)}</span>;
    case 'null':
      return <span className={styles.null}>null</span>;
    default:
      return <span>{String(data)}</span>;
  }
};

const renderSummary = (data: any, kind: ValueKind, isExpanded: boolean) => {
  if (isExpanded) {
    return (
      <span className={styles.bracket}>{kind === 'array' ? '[' : '{'}</span>
    );
  }
  const count =
    kind === 'array' ? data.length : Object.keys(data as object).length;
  const open = kind === 'array' ? '[' : '{';
  const close = kind === 'array' ? ']' : '}';
  const noun =
    kind === 'array'
      ? count === 1
        ? 'item'
        : 'items'
      : count === 1
        ? 'key'
        : 'keys';
  return (
    <>
      <span className={styles.bracket}>{open}</span>
      <span className={styles.summary}>
        {' '}
        {count} {noun}{' '}
      </span>
      <span className={styles.bracket}>{close}</span>
    </>
  );
};

export const DataNode: React.FC<{
  name: string;
  data: any;
  depth: number;
  onToggle: () => void;
  isExpanded: boolean;
  isMatched: boolean;
  onCopyPath: () => void;
  onCopyValue: () => void;
}> = ({
  name,
  data,
  depth,
  onToggle,
  isExpanded,
  isMatched,
  onCopyPath,
  onCopyValue,
}) => {
  const kind = kindOf(data);
  const isExpandable = kind === 'object' || kind === 'array';
  const isRoot = name === 'root';

  return (
    <Indent
      level={depth}
      base={4}
      className={cn(styles.row, isMatched ? styles.rowMatched : styles.rowIdle)}
    >
      {Array.from({ length: depth }).map((_, i) => (
        <span key={i} className={styles.indentGuide} aria-hidden />
      ))}

      {isExpandable ? (
        <IconButton
          variant="ghost"
          className={styles.chevron}
          onClick={onToggle}
          label={isExpanded ? 'Collapse' : 'Expand'}
          icon={
            isExpanded ? (
              <IconChevronDown size="sm" />
            ) : (
              <IconChevronRight size="sm" />
            )
          }
        />
      ) : (
        <span className={styles.chevronSpacer} aria-hidden />
      )}

      {!isRoot && (
        <>
          <span className={styles.key}>
            {Array.isArray(data) ? name : `"${name}"`}
          </span>
          <span className={styles.colon}>:</span>
        </>
      )}

      <span className={styles.value}>
        {isExpandable
          ? renderSummary(data, kind, isExpanded)
          : renderValue(data, kind)}
      </span>

      <span className={styles.actions}>
        <Tooltip content="Copy path">
          <IconButton
            variant="ghost"
            className={styles.actionBtn}
            label="Copy path"
            onClick={onCopyPath}
            icon={<IconLink2 size="sm" />}
          />
        </Tooltip>
        <Tooltip content="Copy value">
          <IconButton
            variant="ghost"
            className={styles.actionBtn}
            label="Copy value"
            onClick={onCopyValue}
            icon={<IconCopy size="sm" />}
          />
        </Tooltip>
      </span>
    </Indent>
  );
};
