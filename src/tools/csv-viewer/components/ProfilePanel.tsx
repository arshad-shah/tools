import { useEffect, useMemo, useState } from 'react';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { textWorker } from '@/shared/workers/text-client';
import {
  Badge,
  Card,
  DescriptionList,
  Grid,
  Notice,
  Skeleton,
  Stack,
  Table,
  Text,
} from '@arshad-shah/cynosure';
import { Chart } from '@/shared/ui';
import { COLUMN_TYPE_LABEL, type ColumnType } from '../lib/columns';
import type { Row } from '../lib/edit';
import type { ColumnProfile } from '../lib/profile';

interface ProfilePanelProps {
  rows: readonly Row[];
  columns: readonly string[];
  types: Record<string, ColumnType>;
}

const fmt = (v: number | string | undefined) =>
  v === undefined
    ? ''
    : typeof v === 'number'
      ? Number.isInteger(v)
        ? v.toLocaleString('en-US')
        : v.toLocaleString('en-US', { maximumFractionDigits: 4 })
      : v;

function ColumnCard({
  name,
  type,
  p,
}: {
  name: string;
  type: ColumnType;
  p: ColumnProfile;
}) {
  const stats: [string, string][] = [
    ['Values', fmt(p.count)],
    ['Null', fmt(p.nulls)],
    ['Empty', fmt(p.empties)],
    ['Unique', `${p.uniqueApprox ? 'about ' : ''}${fmt(p.unique)}`],
  ];
  if (p.min !== undefined) stats.push(['Min', fmt(p.min)], ['Max', fmt(p.max)]);
  if (p.mean !== undefined)
    stats.push(
      ['Mean', fmt(p.mean)],
      ['Median', fmt(p.median)],
      ['P25', fmt(p.p25)],
      ['P75', fmt(p.p75)],
    );
  return (
    <Card
      as="section"
      title={name}
      headingLevel={3}
      padding="sm"
      actions={
        <Badge variant="soft" size="sm">
          {COLUMN_TYPE_LABEL[type]}
        </Badge>
      }
    >
      <Stack gap="3">
        <DescriptionList
          layout="inline"
          size="sm"
          items={stats.map(([k, v]) => ({ id: k, term: k, detail: v }))}
        />
        {p.histogram && p.histogram.length > 1 && (
          <Chart
            kind="bar"
            xType="band"
            height={140}
            legend={false}
            ariaLabel={`Histogram of ${name}`}
            series={[
              {
                id: name,
                label: name,
                points: p.histogram.map((b) => ({
                  x: `${fmt(b.x0)} to ${fmt(b.x1)}`,
                  y: b.n,
                })),
              },
            ]}
          />
        )}
        {p.top.length > 0 && (
          <Table<[string, number]>
            caption={`Top values of ${name}`}
            captionHidden
            size="sm"
            rows={p.top}
            getRowId={([v]) => v}
            columns={[
              {
                key: 'value',
                header: p.topApprox ? 'Top values (partial)' : 'Top values',
                rowHeader: true,
                cell: ([v]) => <Text truncate>{v}</Text>,
              },
              {
                key: 'count',
                header: 'Count',
                align: 'end',
                cell: ([, n]) => fmt(n),
              },
            ]}
          />
        )}
      </Stack>
    </Card>
  );
}

/** Per-column profile over every filtered row, computed in the worker. */
export function ProfilePanel({ rows, columns, types }: ProfilePanelProps) {
  const [state, setState] = useState<{
    key: unknown;
    profiles: Record<string, ColumnProfile> | null;
    error: ToolError | null;
  }>({ key: null, profiles: null, error: null });
  const sub = useMemo(() => {
    const t: Record<string, ColumnType> = {};
    for (const c of columns) t[c] = types[c] ?? 'text';
    return t;
  }, [columns, types]);
  const key = useMemo(() => ({ rows, sub }), [rows, sub]);

  useEffect(() => {
    const ctrl = new AbortController();
    textWorker()
      .call('csv.profile', [rows as Row[], sub], { signal: ctrl.signal })
      .then(
        (profiles) => setState({ key, profiles, error: null }),
        (e) => {
          if (!ctrl.signal.aborted)
            setState({ key, profiles: null, error: toToolError(e) });
        },
      );
    return () => ctrl.abort();
  }, [key, rows, sub]);

  if (state.key !== key)
    return (
      <Stack gap="3">
        <Text size="sm" tone="muted">
          Profiling columns
        </Text>
        <Skeleton shape="block" height="12rem" />
      </Stack>
    );
  if (state.error)
    return (
      <Notice tone="danger" title="Could not profile the columns">
        {state.error.message}
      </Notice>
    );
  return (
    <Stack gap="3">
      <Text size="sm" tone="muted">
        {`Profiled over ${rows.length.toLocaleString('en-US')} filtered rows.`}
      </Text>
      <Grid columns={{ base: 1, md: 2, xl: 3 }} gap="4">
        {columns.map((c) => (
          <ColumnCard key={c} name={c} type={sub[c]} p={state.profiles![c]} />
        ))}
      </Grid>
    </Stack>
  );
}
