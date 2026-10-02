import { useId, useRef, useState } from 'react';
import { saveBlob } from '@/shared/lib/download';
import { toToolError } from '@/shared/lib/errors';
import { notify } from '@/shared/lib/notify';
import {
  Button,
  Chart,
  EmptyState,
  EmptyStateDescription,
  EmptyStateTitle,
  Inline,
  Label,
  Select,
  Stack,
  Text,
  type ChartHandle,
} from '@/shared/ui';
import { IconDownload } from '@/shared/ui/icons';
import { csvChart, ROW_NUMBER, type CsvChartKind } from '../lib/chart-data';
import type { ColumnType } from '../lib/columns';
import type { Row } from '../lib/edit';

interface ChartPanelProps {
  rows: readonly Row[];
  columns: readonly string[];
  types: Record<string, ColumnType>;
  name: string;
}

const KINDS: { value: CsvChartKind; label: string }[] = [
  { value: 'bar', label: 'Bar' },
  { value: 'line', label: 'Line' },
  { value: 'scatter', label: 'Scatter' },
  { value: 'histogram', label: 'Histogram' },
];

const numeric = (t: ColumnType | undefined) =>
  t === 'integer' || t === 'decimal';

/** Bar, line, scatter or histogram over all filtered rows; PNG export. */
export function ChartPanel({ rows, columns, types, name }: ChartPanelProps) {
  const ids = { kind: useId(), x: useId(), y: useId() };
  const chart = useRef<ChartHandle>(null);
  const numbers = columns.filter((c) => numeric(types[c]));
  const [kind, setKind] = useState<CsvChartKind>('line');
  const [xPick, setX] = useState<string | null>(null);
  const [yPick, setY] = useState<string | null>(null);

  const y =
    yPick !== null && (yPick === ROW_NUMBER || numbers.includes(yPick))
      ? yPick
      : (numbers[0] ?? ROW_NUMBER);
  const xChoices =
    kind === 'bar'
      ? columns.filter((c) => !numeric(types[c]) || types[c] === 'integer')
      : columns.filter((c) => numeric(types[c]) || types[c] === 'date');
  const x =
    xPick !== null && (xPick === ROW_NUMBER || xChoices.includes(xPick))
      ? xPick
      : kind === 'bar'
        ? (xChoices[0] ?? ROW_NUMBER)
        : ROW_NUMBER;

  const data = csvChart(rows, kind, x, y, types);

  if (numbers.length === 0 && kind !== 'bar')
    return (
      <EmptyState>
        <EmptyStateTitle>No numeric columns</EmptyStateTitle>
        <EmptyStateDescription>
          Line, scatter and histogram charts need a column of numbers. A bar
          chart can count rows per value.
        </EmptyStateDescription>
        <Button size="sm" onClick={() => setKind('bar')}>
          Show a bar chart
        </Button>
      </EmptyState>
    );

  const exportPng = async () => {
    try {
      const blob = await chart.current!.exportPng();
      saveBlob(
        blob,
        `${name.replace(/\.[^.]+$/, '') || 'chart'}-chart.png`,
        'image/png',
      );
    } catch (e) {
      notify.error(toToolError(e).message);
    }
  };

  return (
    <Stack gap="3">
      <Inline gap="4" align="center" wrap>
        <Inline gap="2" align="center" wrap={false}>
          <Label htmlFor={ids.kind}>Chart</Label>
          <Select
            id={ids.kind}
            value={kind}
            onValueChange={(v) => setKind(v as CsvChartKind)}
            items={KINDS}
          />
        </Inline>
        {kind !== 'histogram' && (
          <Inline gap="2" align="center" wrap={false}>
            <Label htmlFor={ids.x}>X</Label>
            <Select
              id={ids.x}
              value={x}
              onValueChange={setX}
              items={[
                ...(kind === 'bar'
                  ? []
                  : [{ value: ROW_NUMBER, label: 'Row number' }]),
                ...xChoices.map((c) => ({ value: c, label: c })),
              ]}
            />
          </Inline>
        )}
        <Inline gap="2" align="center" wrap={false}>
          <Label htmlFor={ids.y}>Y</Label>
          <Select
            id={ids.y}
            value={y}
            onValueChange={setY}
            items={[
              ...(kind === 'bar'
                ? [{ value: ROW_NUMBER, label: 'Row count' }]
                : []),
              ...numbers.map((c) => ({ value: c, label: c })),
            ]}
          />
        </Inline>
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<IconDownload size="sm" />}
          onClick={() => void exportPng()}
        >
          PNG
        </Button>
      </Inline>
      <Chart
        ref={chart}
        kind={kind}
        series={data.series}
        xType={data.xType}
        height={360}
        zoomable={kind === 'line' || kind === 'scatter'}
        ariaLabel={`${KINDS.find((k) => k.value === kind)!.label} chart of ${y || 'row count'}`}
        xLabel={kind === 'histogram' ? y : x || 'Row number'}
        yLabel={kind === 'histogram' ? 'Rows' : y || 'Rows'}
        legend={false}
      />
      <Text size="xs" tone="subtle">
        {`Drawn from ${data.used.toLocaleString('en-US')} of ${rows.length.toLocaleString('en-US')} filtered rows${data.reduced ? (kind === 'bar' ? ', largest 50 categories' : ', downsampled for display') : ''}.`}
      </Text>
    </Stack>
  );
}
