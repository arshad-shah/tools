import {
  Button,
  EmptyState,
  Inline,
  Select,
  Slider,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { chartLine, download } from '@arshad-shah/cynosure/icons';
import {
  Bar,
  Line,
  Scatter,
  type ChartRef,
} from '@arshad-shah/swift-chart/react';
import { useRef, useState } from 'react';
import { saveBlob } from '@/shared/lib/download';
import { toToolError } from '@/shared/lib/errors';
import { notify } from '@/shared/lib/notify';
// swift-chart draws the chart (a canvas); everything around it is Cynosure.
import { ChartFrame, chartPng, useChartTheme } from '@/shared/charts';
import {
  csvChart,
  fmtNumber,
  fmtTime,
  ROW_NUMBER,
  type ChartRow,
  type CsvChartKind,
} from '../lib/chart-data';
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
  const chart = useRef<ChartRef>(null);
  const theme = useChartTheme();
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
  // Zoom: the shown stretch of points along x (line and scatter), kept
  // while the same rows and columns are charted.
  const zoomable = kind === 'line' || kind === 'scatter';
  const key = [rows, kind, x, y] as const;
  const [zoom, setZoom] = useState<{
    key: readonly unknown[];
    at: number[];
  } | null>(null);
  const last = Math.max(0, data.rows.length - 1);
  const [from, to] =
    zoomable && zoom && zoom.key.every((k, i) => k === key[i])
      ? zoom.at
      : [0, last];
  const shown = data.rows.slice(from, to + 1);

  if (numbers.length === 0 && kind !== 'bar')
    return (
      <EmptyState
        icon={chartLine}
        title="No numeric columns"
        description="Line, scatter and histogram charts need a column of numbers. A bar chart can count rows per value."
        actions={
          <Button size="sm" variant="soft" onClick={() => setKind('bar')}>
            Show a bar chart
          </Button>
        }
      />
    );

  const exportPng = () => {
    try {
      const blob = chartPng(chart.current);
      if (!blob) return;
      saveBlob(
        blob,
        `${name.replace(/\.[^.]+$/, '') || 'chart'}-chart.png`,
        'image/png',
      );
    } catch (e) {
      notify.error(toToolError(e).message);
    }
  };

  const xName = kind === 'histogram' ? y : x || 'Row number';
  const yName = kind === 'histogram' ? 'Rows' : y || 'Rows';
  const label = `${KINDS.find((k) => k.value === kind)!.label} chart of ${y || 'row count'}`;
  const common = {
    theme: theme.name,
    height: 360,
    showLegend: false,
    ariaLabel: label,
    ariaDescription: `${yName} by ${xName}`,
  };
  const mapping = { x: 'label', y: 'y', seriesNames: [yName] };

  return (
    <Stack gap="3">
      <Inline gap="3" align="end" wrap>
        <Select
          label="Chart"
          size="sm"
          value={kind}
          onChange={(v) => setKind(v as CsvChartKind)}
          options={KINDS}
        />
        {kind !== 'histogram' && (
          <Select
            label="X"
            size="sm"
            value={x}
            onChange={setX}
            options={[
              ...(kind === 'bar'
                ? []
                : [{ value: ROW_NUMBER, label: 'Row number' }]),
              ...xChoices.map((c) => ({ value: c, label: c })),
            ]}
          />
        )}
        <Select
          label="Y"
          size="sm"
          value={y}
          onChange={setY}
          options={[
            ...(kind === 'bar'
              ? [{ value: ROW_NUMBER, label: 'Row count' }]
              : []),
            ...numbers.map((c) => ({ value: c, label: c })),
          ]}
        />
        <Button size="sm" variant="soft" icon={download} onClick={exportPng}>
          Download PNG
        </Button>
      </Inline>
      <ChartFrame<ChartRow>
        table={{
          caption: label,
          rows: shown,
          getRowId: (r) => `${r.x}`,
          columns: [
            { key: 'label', header: xName },
            {
              key: 'y',
              header: yName,
              align: 'end',
              cell: (r) => fmtNumber(r.y),
            },
          ],
        }}
      >
        {kind === 'scatter' ? (
          <Scatter
            ref={chart}
            {...common}
            data={shown}
            mapping={{ x: 'x', y: 'y', labelField: 'label' }}
            formatValue={scatterFormat(shown, data.time)}
          />
        ) : kind === 'line' ? (
          <Line
            ref={chart}
            {...common}
            data={shown}
            mapping={mapping}
            dots={false}
            smooth={false}
            formatValue={fmtNumber}
          />
        ) : (
          <Bar
            ref={chart}
            {...common}
            data={shown}
            mapping={mapping}
            formatValue={fmtNumber}
          />
        )}
        {zoomable && data.rows.length > 2 ? (
          <Slider
            label="Shown range"
            size="sm"
            min={0}
            max={last}
            value={[from, to]}
            onChange={(at) => setZoom({ key, at: at as number[] })}
            labels={{
              minimum: 'from',
              maximum: 'to',
              value: (i) => data.rows[i]?.label ?? '',
            }}
            showValue
          />
        ) : null}
      </ChartFrame>
      <Text size="xs" tone="muted">
        {`Drawn from ${data.used.toLocaleString('en-US')} of ${rows.length.toLocaleString('en-US')} filtered rows${data.reduced ? (kind === 'bar' ? ', largest 50 categories' : ', downsampled for display') : ''}.`}
      </Text>
    </Stack>
  );
}

/**
 * swift-chart's scatter formats both axes with one function: times on x
 * read as dates, while y values (far from those times) stay numbers.
 */
function scatterFormat(rows: readonly ChartRow[], time: boolean) {
  if (!time || rows.length === 0) return fmtNumber;
  const xs = rows.map((r) => r.x as number);
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  const pad = Math.max(hi - lo, 86_400_000);
  return (v: number) =>
    v >= lo - pad && v <= hi + pad ? fmtTime(v) : fmtNumber(v);
}
