import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Braces, Brackets, Hash } from 'lucide-react';
import { MainNode } from './types';
import styles from './CustomNode.module.css';

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
    <div className={`${styles.node} ${styles[data.type]}`}>
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
              <span className={`${styles.val} ${classifyValue(value)}`}>
                {value}
              </span>
            </div>
          ))
        ) : (
          <div
            className={`${styles.primitiveVal} ${classifyValue(
              data.content || '',
            )}`}
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
