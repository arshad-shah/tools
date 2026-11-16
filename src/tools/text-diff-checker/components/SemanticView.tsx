import { useMemo, useState } from 'react';
import { Notice, Select, Stack, Switch } from '@arshad-shah/cynosure';
import { toToolError } from '@/shared/lib/errors';
import {
  csvColumns,
  diffCsv,
  diffIgnoreOrder,
  diffJson,
} from '../lib/semantic';
import type { DiffMode } from '../settings';
import {
  CsvChangesTable,
  JsonChangesTable,
  OrderlessTable,
} from './SemanticTable';

interface SemanticViewProps {
  mode: Exclude<DiffMode, 'text'>;
  left: string;
  right: string;
  sortKeys: boolean;
  onSortKeys(v: boolean): void;
}

/** JSON, CSV-by-key and ignore-order comparisons (spec §8.1). */
export function SemanticView({
  mode,
  left,
  right,
  sortKeys,
  onSortKeys,
}: SemanticViewProps) {
  const columns = useMemo(
    () => (mode === 'csv' ? csvColumns(left) : []),
    [mode, left],
  );
  const [picked, setPicked] = useState('');
  const key = columns.includes(picked) ? picked : (columns[0] ?? '');

  const outcome = useMemo(() => {
    if (!left.trim() || !right.trim()) return null;
    try {
      if (mode === 'json') return { json: diffJson(left, right, { sortKeys }) };
      if (mode === 'csv')
        return key ? { csv: diffCsv(left, right, { key }) } : null;
      return { lines: diffIgnoreOrder(left, right) };
    } catch (e) {
      return { error: toToolError(e) };
    }
  }, [mode, left, right, sortKeys, key]);

  return (
    <Stack gap="3">
      {mode === 'json' && (
        <Switch label="Sort keys" checked={sortKeys} onChange={onSortKeys} />
      )}
      {mode === 'csv' && columns.length > 0 && (
        <Select
          label="Key column"
          value={key}
          onChange={setPicked}
          options={columns.map((c) => ({ value: c, label: c }))}
        />
      )}
      {outcome && 'error' in outcome && outcome.error && (
        <Notice
          tone="danger"
          title={`Could not compare as ${mode === 'json' ? 'JSON' : mode === 'csv' ? 'CSV' : 'lines'}`}
        >
          {outcome.error.message}
        </Notice>
      )}
      {outcome && 'json' in outcome && outcome.json && (
        <JsonChangesTable changes={outcome.json} />
      )}
      {outcome && 'csv' in outcome && outcome.csv && (
        <CsvChangesTable changes={outcome.csv} keyColumn={key} />
      )}
      {outcome && 'lines' in outcome && outcome.lines && (
        <OrderlessTable
          added={outcome.lines.added}
          removed={outcome.lines.removed}
        />
      )}
    </Stack>
  );
}
