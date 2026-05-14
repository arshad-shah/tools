/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { ChevronDown, ChevronRight, Copy, Link2 } from 'lucide-react';
import { Tooltip } from '@arshad-shah/cynosure-react';
import styles from './DataNode.module.css';

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

const DataNode: React.FC<{
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
    <div
      className={`${styles.row} ${isMatched ? styles.matched : ''}`}
      style={{ paddingLeft: 4 + depth * 16 }}
    >
      {Array.from({ length: depth }).map((_, i) => (
        <span key={i} className={styles.indentGuide} aria-hidden />
      ))}

      {isExpandable ? (
        <button
          type="button"
          className={styles.chevron}
          onClick={onToggle}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
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
          <button
            type="button"
            className={styles.actionBtn}
            aria-label="Copy path"
            onClick={onCopyPath}
          >
            <Link2 size={12} />
          </button>
        </Tooltip>
        <Tooltip content="Copy value">
          <button
            type="button"
            className={styles.actionBtn}
            aria-label="Copy value"
            onClick={onCopyValue}
          >
            <Copy size={12} />
          </button>
        </Tooltip>
      </span>
    </div>
  );
};

export default DataNode;
