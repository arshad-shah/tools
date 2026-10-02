import React, { useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  EmptyState,
  Grid,
  IconButton,
  Inline,
  Input,
  Label,
  NumberInput,
  Stack,
  Text,
} from '@/shared/ui';
import {
  Chart,
  type ChartFunction,
  type ChartHandle,
  type ChartHover,
} from '@/shared/ui/chart';
import { IconDownload, IconPlus, IconTrash2 } from '@/shared/ui/icons';
import { saveBlob } from '@/shared/lib/download';
import { notify } from '@/shared/lib/notify';
import { toToolError } from '@/shared/lib/errors';
import { compileFunction } from '../lib/evaluate';
import { findIntersections, findRoots } from '../lib/roots';
import type { AngleUnit } from '../types';

const MAX_FUNCTIONS = 6;
/** Literal classes of the chart's series colours, in plotting order. */
const SERIES_DOT = [
  'bg-chart-1',
  'bg-chart-2',
  'bg-chart-3',
  'bg-chart-4',
  'bg-chart-5',
  'bg-chart-6',
];

interface Row {
  id: number;
  expr: string;
}

interface Point {
  x: number;
  label: string;
}

/** Short, stable text for a coordinate (no -0, 10 significant digits). */
const fmt = (n: number) => {
  const v = Number(n.toPrecision(10));
  return String(Object.is(v, -0) ? 0 : v);
};

const ordered = ([a, b]: [number, number]): [number, number] =>
  b > a ? [a, b] : [b, a];

interface GrapherProps {
  angle: AngleUnit;
}

/**
 * Up to six functions of x on the kit Chart (adaptive sampling, pan and
 * zoom), a trace readout, the roots and intersections in the x range
 * (click one to centre the view on it) and PNG export.
 */
export const Grapher: React.FC<GrapherProps> = ({ angle }) => {
  const [rows, setRows] = useState<Row[]>([{ id: 1, expr: 'sin(x)' }]);
  const [range, setRange] = useState<[number, number]>([-10, 10]);
  const [trace, setTrace] = useState<ChartHover | null>(null);
  const chart = useRef<ChartHandle>(null);
  const nextId = useRef(2);
  const domain = ordered(range);

  const compiled = useMemo(
    () =>
      rows.map((r) => {
        if (r.expr.trim() === '') return { row: r };
        try {
          return { row: r, fn: compileFunction(r.expr, angle) };
        } catch (e) {
          return { row: r, error: toToolError(e).message };
        }
      }),
    [rows, angle],
  );

  const fns = useMemo<ChartFunction[]>(
    () =>
      compiled.flatMap(({ row, fn }) =>
        fn
          ? [{ id: `f${row.id}`, label: `f${row.id}(x) = ${row.expr}`, fn }]
          : [],
      ),
    [compiled],
  );

  const points = useMemo(() => {
    const domain = ordered(range);
    // Brent stops within 1e-12, so a root at 0 can read 3e-14: snap it.
    const tiny = (domain[1] - domain[0]) * 1e-9;
    const snap = (n: number) => (Math.abs(n) < tiny ? 0 : n);
    const out: Point[] = [];
    fns.forEach((f) =>
      findRoots(f.fn, domain).forEach((x) =>
        out.push({ x, label: `${f.id} root at x = ${fmt(snap(x))}` }),
      ),
    );
    fns.forEach((f, i) =>
      fns.slice(i + 1).forEach((g) =>
        findIntersections(f.fn, g.fn, domain).forEach((x) =>
          out.push({
            x,
            label: `${f.id} meets ${g.id} at (${fmt(snap(x))}, ${fmt(snap(f.fn(x)))})`,
          }),
        ),
      ),
    );
    return out;
  }, [fns, range]);

  const setExpr = (id: number, expr: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, expr } : r)));
  const centre = (x: number) => {
    const half = (domain[1] - domain[0]) / 2;
    setRange([x - half, x + half]);
  };
  const exportPng = async () => {
    try {
      const blob = await chart.current?.exportPng();
      if (blob) saveBlob(blob, 'graph.png');
    } catch (e) {
      notify.error(toToolError(e, 'Could not export the graph'));
    }
  };

  const traced = trace && fns.find((f) => f.id === trace.seriesId);
  const plotIndex = (id: number) => fns.findIndex((f) => f.id === `f${id}`);

  return (
    <Stack gap="4">
      <Stack gap="2">
        {compiled.map(({ row, error }) => {
          const at = plotIndex(row.id);
          return (
            <Stack gap="1" key={row.id}>
              <Inline gap="2" align="center">
                <Box
                  aria-hidden
                  className={`size-3 shrink-0 rounded-full ${at >= 0 ? SERIES_DOT[at] : 'bg-surface-3'}`}
                />
                <Label htmlFor={`fn-${row.id}`} className="shrink-0 font-mono">
                  {`f${row.id}(x) =`}
                </Label>
                <Box className="min-w-0 flex-1">
                  <Input
                    id={`fn-${row.id}`}
                    value={row.expr}
                    onChange={(t) => setExpr(row.id, t)}
                    invalid={!!error}
                    className="font-mono"
                    spellCheck={false}
                  />
                </Box>
                <IconButton
                  size="sm"
                  variant="ghost"
                  label={`Remove f${row.id}`}
                  icon={IconTrash2}
                  disabled={rows.length === 1}
                  onClick={() =>
                    setRows((rs) => rs.filter((r) => r.id !== row.id))
                  }
                />
              </Inline>
              {error && (
                <Text size="xs" className="text-danger">
                  Cannot plot: {error}
                </Text>
              )}
            </Stack>
          );
        })}
        <Inline gap="2" wrap>
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<IconPlus size="sm" />}
            disabled={rows.length >= MAX_FUNCTIONS}
            onClick={() =>
              setRows((rs) => [...rs, { id: nextId.current++, expr: '' }])
            }
          >
            Add function
          </Button>
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<IconDownload size="sm" />}
            disabled={fns.length === 0}
            onClick={() => void exportPng()}
          >
            Export PNG
          </Button>
        </Inline>
      </Stack>

      <Grid cols={2} gap="3">
        <Stack gap="1">
          <Label htmlFor="graph-min-x">Min X</Label>
          <NumberInput
            id="graph-min-x"
            aria-label="Minimum X value"
            value={range[0]}
            step={1}
            onValueChange={(v) => setRange([v, range[1]])}
          />
        </Stack>
        <Stack gap="1">
          <Label htmlFor="graph-max-x">Max X</Label>
          <NumberInput
            id="graph-max-x"
            aria-label="Maximum X value"
            value={range[1]}
            step={1}
            onValueChange={(v) => setRange([range[0], v])}
          />
        </Stack>
      </Grid>

      <Chart
        ref={chart}
        kind="function"
        fns={fns}
        xDomain={domain}
        height={400}
        xLabel="x"
        yLabel="y"
        zoomable
        onPointHover={setTrace}
        ariaLabel="Graph of the functions"
        ariaSummary={`${fns.map((f) => f.label).join('; ') || 'No functions'}, for x from ${fmt(domain[0])} to ${fmt(domain[1])}`}
      />
      <Text size="sm" mono tone="muted" aria-live="polite">
        {traced && typeof trace.x === 'number' && trace.y !== null
          ? `Trace ${traced.id}: x = ${fmt(trace.x)}, y = ${fmt(trace.y)}`
          : 'Point at the graph to trace a function'}
      </Text>

      <Stack gap="2">
        <Text weight="semibold">Roots and intersections</Text>
        {points.length === 0 ? (
          <EmptyState
            size="sm"
            title="None in this range"
            description="Pan or zoom the graph to look elsewhere."
          />
        ) : (
          <Inline gap="2" wrap aria-label="Roots and intersections" role="list">
            {points.map((p) => (
              <Box role="listitem" key={p.label}>
                <Button
                  size="sm"
                  variant="ghost"
                  className="border border-line font-mono"
                  aria-label={`${p.label}, centre the graph here`}
                  onClick={() => centre(p.x)}
                >
                  {p.label}
                </Button>
              </Box>
            ))}
          </Inline>
        )}
      </Stack>
    </Stack>
  );
};
