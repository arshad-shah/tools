import {
  Badge,
  Button,
  Card,
  EmptyState,
  Grid,
  IconButton,
  Inline,
  NumberField,
  Stack,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import { download, plus, target, trash } from '@arshad-shah/cynosure/icons';
import React, { useMemo, useRef, useState } from 'react';
// The kit Chart is a drawing surface (a canvas): Cynosure has no plot
// (docs/cynosure-gaps.md).
import {
  Chart,
  type ChartFunction,
  type ChartHandle,
  type ChartHover,
} from '@/shared/ui/chart';
import { saveBlob } from '@/shared/lib/download';
import { notify } from '@/shared/lib/notify';
import { toToolError } from '@/shared/lib/errors';
import { compileFunction } from '../lib/evaluate';
import { findIntersections, findRoots } from '../lib/roots';
import type { AngleUnit } from '../types';

const MAX_FUNCTIONS = 6;
/** The chart's series colour for a plotted function, in plotting order. */
const seriesColour = (at: number) => `var(--chart-${at + 1})`;

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

  const traceText =
    traced && typeof trace.x === 'number' && trace.y !== null
      ? `Trace ${traced.id}: x = ${fmt(trace.x)}, y = ${fmt(trace.y)}`
      : 'Point at the graph to trace a function';

  return (
    <Stack gap="6">
      <Card
        as="section"
        title="Functions"
        actions={
          <Inline gap="2">
            <Button
              size="sm"
              variant="soft"
              icon={plus}
              disabled={rows.length >= MAX_FUNCTIONS}
              onClick={() =>
                setRows((rs) => [...rs, { id: nextId.current++, expr: '' }])
              }
            >
              Add function
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={download}
              disabled={fns.length === 0}
              onClick={() => void exportPng()}
            >
              Export PNG
            </Button>
          </Inline>
        }
      >
        <Stack gap="4">
          {compiled.map(({ row, error }) => {
            const at = plotIndex(row.id);
            return (
              <Grid
                key={row.id}
                columns="auto minmax(0, 1fr) auto"
                gap="3"
                align="center"
              >
                <Badge
                  dot
                  tone="neutral"
                  color={at >= 0 ? seriesColour(at) : undefined}
                />
                <TextField
                  label={`f${row.id}(x) =`}
                  labelHidden
                  addonStart={`f${row.id}(x) =`}
                  value={row.expr}
                  onChange={(t) => setExpr(row.id, t)}
                  error={error ? `Cannot plot: ${error}` : undefined}
                  spellCheck={false}
                  autoComplete="off"
                />
                <IconButton
                  size="sm"
                  variant="ghost"
                  tone="neutral"
                  label={`Remove f${row.id}`}
                  icon={trash}
                  disabled={rows.length === 1}
                  onClick={() =>
                    setRows((rs) => rs.filter((r) => r.id !== row.id))
                  }
                />
              </Grid>
            );
          })}
          <Grid columns={2} gap="4">
            <NumberField
              label="Min X"
              value={range[0]}
              step={1}
              onChange={(v) => v !== null && setRange([v, range[1]])}
            />
            <NumberField
              label="Max X"
              value={range[1]}
              step={1}
              onChange={(v) => v !== null && setRange([range[0], v])}
            />
          </Grid>
        </Stack>
      </Card>

      <Card as="section" title="Graph">
        <Stack gap="4">
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
          <Stack aria-live="polite">
            <Text size="sm" tone="muted" numeric>
              {traceText}
            </Text>
          </Stack>
        </Stack>
      </Card>

      <Card as="section" title="Roots and intersections">
        {points.length === 0 ? (
          <EmptyState
            size="sm"
            icon={target}
            title="None in this range"
            description="Pan or zoom the graph to look elsewhere."
          />
        ) : (
          <Inline
            gap="2"
            wrap
            role="group"
            aria-label="Roots and intersections"
          >
            {points.map((p) => (
              <Button
                key={p.label}
                size="sm"
                variant="outline"
                tone="neutral"
                icon={target}
                aria-label={`${p.label}, centre the graph here`}
                onClick={() => centre(p.x)}
              >
                {p.label}
              </Button>
            ))}
          </Inline>
        )}
      </Card>
    </Stack>
  );
};
