import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Braces, Brackets, Hash } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { MainNode, NodeType } from './types';

/** Network-node classes (formerly a CSS module). */
const styles = {
  node: 'max-w-[280px] min-w-[180px] overflow-hidden rounded-lg border border-line bg-surface font-sans text-[12px] text-fg shadow-raised',
  header:
    'flex items-center gap-1.5 border-b border-line bg-surface-subtle px-2.5 py-1.5 text-[11px] font-semibold tracking-[0.04em] text-fg-muted uppercase',
  label:
    'min-w-0 flex-1 truncate font-mono text-[12px] font-semibold tracking-normal text-fg normal-case',
  body: 'max-h-[220px] overflow-auto px-2.5 py-1.5 font-mono text-[12px]',
  row: 'flex min-w-0 items-baseline justify-between gap-3 py-0.5 [&+&]:border-t [&+&]:border-dashed [&+&]:border-line',
  key: 'max-w-[60%] truncate font-medium text-fg-muted',
  val: 'min-w-0 truncate text-right',
  string: 'text-success',
  number: 'text-info',
  boolean: 'font-semibold text-warning',
  null: 'italic text-fg-subtle',
  primitiveVal: 'py-1 break-all whitespace-normal',
  handle: 'size-2! border-2! border-surface! bg-accent!',
} as const;

const TYPE_ACCENT: Record<NodeType, string> = {
  object: 'border-t-[3px] border-t-accent',
  array: 'border-t-[3px] border-t-warning',
  primitive: 'border-t-[3px] border-t-success',
};

const parseKeyValuePairs = (content: string): Record<string, string> | null => {
  try {
    const pairs = content
      .split('\n')
      .filter((line) => line.includes(':'))
      .reduce<Record<string, string>>((acc, line) => {
        const [key, ...values] = line.split(':');
        const value = values.join(':').trim();
        return { ...acc, [key.trim()]: value };
      }, {});
    return Object.keys(pairs).length > 0 ? pairs : null;
  } catch {
    return null;
  }
};

const classifyValue = (raw: string): string => {
  const trimmed = raw.trim();
  if (trimmed === 'null' || trimmed === 'undefined') return styles.null;
  if (trimmed === 'true' || trimmed === 'false') return styles.boolean;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return styles.number;
  return styles.string;
};

const CustomNode: React.FC<NodeProps<MainNode>> = ({ data }) => {
  const isPrimitive = data.type === 'primitive';
  const isArray = data.type === 'array';
  const Icon = isArray ? Brackets : isPrimitive ? Hash : Braces;
  const kindLabel = isArray ? 'Array' : isPrimitive ? 'Value' : 'Object';

  const pairs =
    typeof data.content === 'string' ? parseKeyValuePairs(data.content) : null;

  return (
    <div className={cn(styles.node, TYPE_ACCENT[data.type])}>
      <Handle
        type="target"
        position={Position.Left}
        className={styles.handle}
      />
      <div className={styles.header}>
        <Icon size={12} aria-hidden />
        <span>{kindLabel}</span>
        <span className={styles.label}>{data.label}</span>
      </div>
      <div className={styles.body}>
        {pairs ? (
          Object.entries(pairs).map(([key, value]) => (
            <div key={key} className={styles.row}>
              <span className={styles.key}>{key}</span>
              <span className={cn(styles.val, classifyValue(value))}>
                {value}
              </span>
            </div>
          ))
        ) : (
          <div
            className={cn(
              styles.primitiveVal,
              classifyValue(data.content || ''),
            )}
          >
            {data.content}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className={styles.handle}
      />
    </div>
  );
};

export default CustomNode;
