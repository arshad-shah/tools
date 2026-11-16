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
import {
  chevronLeft,
  chevronRight,
  download,
  plus,
  rotateCcw,
  target,
  trash,
  zoomIn,
  zoomOut,
} from '@arshad-shah/cynosure/icons';
import { useDrag } from '@arshad-shah/cynosure';
import { Line, type ChartRef } from '@arshad-shah/swift-chart/react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
// swift-chart draws the graph (a canvas): the owner chose it over a
// Cynosure plot. Every control around it is Cynosure.
import { ChartFrame, chartPng, useChartTheme } from '@/shared/charts';
import { saveBlob } from '@/shared/lib/download';
import { notify } from '@/shared/lib/notify';
import { toToolError } from '@/shared/lib/errors';
import { compileFunction } from '../lib/evaluate';
import { findIntersections, findRoots } from '../lib/roots';
import type { AngleUnit } from '../types';

const MAX_FUNCTIONS = 6;
/** A plotted function's series colour (swift-chart's theme uses the same). */
const seriesColour = (at: number) => `var(--cy-color-series-${at + 1})`;
/** Samples across the x range per function. */
const SAMPLES = 161;
/** Rows in the data table (the graph's accessible twin). */
const TABLE_POINTS = 21;
const DEFAULT_RANGE: [number, number] = [-10, 10];

interface Plotted {
  id: string;
  label: string;
  fn(x: number): number;
}

/** `fn` at `n` evenly spaced x across the domain. */
function sampleAt(fn: (x: number) => number, xs: number[]) {
  return xs.map((x) => {
    try {
      const y = fn(x);
      return Number.isFinite(y) ? y : NaN;
    } catch {
      return NaN;
    }
  });
}

/** Samples between two labelled x-axis ticks (SAMPLES - 1 is a multiple). */
const TICK_EVERY = 16;

/**
 * x-axis labels for the samples: every TICK_EVERY-th sample is labelled,
 * the rest are blank, so swift-chart's label thinning (which keeps every
 * m-th label, m a small power-friendly step) shows ten even ticks rather
 * than a crowd. The readout under the graph gives any sample's exact x.
 */
function axisLabels(a: number, b: number, n: number): string[] {
  return Array.from({ length: n }, (_, i) =>
    i % TICK_EVERY === 0
      ? fmt(Number((a + ((b - a) * i) / (n - 1)).toPrecision(3)))
      : '',
  );
}

const spaced = ([a, b]: [number, number], n: number) =>
  Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));

/**
 * The y values worth showing: outliers past an asymptote (tan near pi/2)
 * would squash the rest, so values far outside the middle 96 percent are
 * left out of the drawing (NaN), like the gap a plotter leaves.
 */
function clip(series: number[][]): number[][] {
  const all = series
    .flat()
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  if (all.length < 10) return series;
  const lo = all[Math.floor(all.length * 0.02)];
  const hi = all[Math.ceil(all.length * 0.98) - 1];
  const pad = (hi - lo || 1) * 0.5;
  return series.map((ys) =>
    ys.map((y) => (y < lo - pad || y > hi + pad ? NaN : y)),
  );
}

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
  const [range, setRange] = useState<[number, number]>(DEFAULT_RANGE);
  const [trace, setTrace] = useState<number | null>(null);
  const chart = useRef<ChartRef>(null);
  const plot = useRef<HTMLElement>(null);
  const theme = useChartTheme();
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

  const fns = useMemo<Plotted[]>(
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
  /** Zoom by `factor` about x = `at` (default the centre). */
  const zoom = (factor: number, at = (domain[0] + domain[1]) / 2) =>
    setRange([at - (at - domain[0]) * factor, at + (domain[1] - at) * factor]);
  const pan = (fraction: number) => {
    const d = (domain[1] - domain[0]) * fraction;
    setRange([domain[0] + d, domain[1] + d]);
  };
  const exportPng = () => {
    try {
      const blob = chartPng(chart.current);
      if (blob) saveBlob(blob, 'graph.png');
    } catch (e) {
      notify.error(toToolError(e, 'Could not export the graph'));
    }
  };

  const [d0, d1] = domain;
  const xs = useMemo(() => spaced([d0, d1], SAMPLES), [d0, d1]);
  const data = useMemo(() => {
    const ys = clip(fns.map((f) => sampleAt(f.fn, xs)));
    return {
      labels: axisLabels(d0, d1, SAMPLES),
      datasets: fns.map((f, i) => ({ label: f.label, data: ys[i] })),
    };
  }, [fns, xs, d0, d1]);

  // Pointer on the plot: drag pans, the wheel zooms about the pointer.
  const xAt = (clientX: number) => {
    const c = chart.current?.chart;
    if (!c) return null;
    const box = c.canvas.getBoundingClientRect();
    const area = c.plotArea;
    const t = (clientX - box.left - area.x) / (area.w || 1);
    return domain[0] + (domain[1] - domain[0]) * t;
  };
  const dragFrom = useRef<{ x: number; range: [number, number] } | null>(null);
  useDrag(plot, {
    distance: 4,
    delay: 200,
    onStart: ({ point }) => {
      dragFrom.current = { x: point.x, range: domain };
    },
    onMove: ({ point }) => {
      const from = dragFrom.current;
      const c = chart.current?.chart;
      if (!from || !c) return;
      const per = (from.range[1] - from.range[0]) / (c.plotArea.w || 1);
      const d = (point.x - from.x) * per;
      setRange([from.range[0] - d, from.range[1] - d]);
    },
    onEnd: (_s, cancelled) => {
      if (cancelled && dragFrom.current) setRange(dragFrom.current.range);
      dragFrom.current = null;
    },
  });
  const onWheel = useRef<(e: WheelEvent) => void>(() => {});
  useEffect(() => {
    onWheel.current = (e) => {
      const at = xAt(e.clientX);
      if (at === null) return;
      e.preventDefault();
      zoom(e.deltaY > 0 ? 1.2 : 1 / 1.2, at);
    };
  });
  useEffect(() => {
    const el = plot.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => onWheel.current(e);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, []);
  // Hover readout: the sample under the pointer, from swift-chart's hover.
  useEffect(() => {
    const el = plot.current;
    if (!el) return;
    const read = () => {
      const i = chart.current?.chart?.hoverIndex ?? -1;
      setTrace(i >= 0 ? i : null);
    };
    const leave = () => setTrace(null);
    // After swift-chart's own canvas listeners have set its hover index.
    el.addEventListener('mousemove', read);
    el.addEventListener('touchmove', read);
    el.addEventListener('mouseleave', leave);
    return () => {
      el.removeEventListener('mousemove', read);
      el.removeEventListener('touchmove', read);
      el.removeEventListener('mouseleave', leave);
    };
  }, []);

  const plotIndex = (id: number) => fns.findIndex((f) => f.id === `f${id}`);
  const traceText =
    trace !== null && fns.length
      ? `x = ${fmt(xs[trace])}: ${fns
          .map((f, i) => {
            const y = data.datasets[i]?.data[trace];
            return `${f.id} = ${Number.isFinite(y) ? fmt(y) : 'undefined'}`;
          })
          .join(', ')}`
      : 'Point at the graph to trace the functions';
  const tableXs = spaced(domain, TABLE_POINTS);
  const tableRows = tableXs.map((x) => ({
    id: String(x),
    x: fmt(x),
    ...Object.fromEntries(
      fns.map((f) => {
        const [y] = sampleAt(f.fn, [x]);
        return [f.id, Number.isFinite(y) ? fmt(y) : 'undefined'];
      }),
    ),
  }));

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
              onClick={exportPng}
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

      <Card
        as="section"
        title="Graph"
        actions={
          <Inline gap="1" role="group" aria-label="Pan and zoom">
            <IconButton
              size="sm"
              variant="ghost"
              tone="neutral"
              icon={chevronLeft}
              label="Pan left"
              onClick={() => pan(-0.25)}
            />
            <IconButton
              size="sm"
              variant="ghost"
              tone="neutral"
              icon={chevronRight}
              label="Pan right"
              onClick={() => pan(0.25)}
            />
            <IconButton
              size="sm"
              variant="ghost"
              tone="neutral"
              icon={zoomIn}
              label="Zoom in"
              onClick={() => zoom(1 / 1.5)}
            />
            <IconButton
              size="sm"
              variant="ghost"
              tone="neutral"
              icon={zoomOut}
              label="Zoom out"
              onClick={() => zoom(1.5)}
            />
            <IconButton
              size="sm"
              variant="ghost"
              tone="neutral"
              icon={rotateCcw}
              label="Reset view"
              onClick={() => setRange(DEFAULT_RANGE)}
            />
          </Inline>
        }
      >
        <Stack gap="4">
          <ChartFrame
            table={{
              caption: 'Values of the functions',
              rows: tableRows,
              getRowId: (r) => r.id,
              columns: [
                { key: 'x', header: 'x', align: 'end' },
                ...fns.map((f) => ({
                  key: f.id,
                  header: `${f.id}(x)`,
                  align: 'end' as const,
                })),
              ],
            }}
          >
            <Stack ref={plot}>
              <Line
                ref={chart}
                data={[]}
                mapping={data}
                theme={theme.name}
                height={400}
                animate={false}
                dots={false}
                smooth={false}
                lineWidth={2}
                legendPosition="bottom"
                formatValue={(v) => (Number.isFinite(v) ? fmt(v) : 'undefined')}
                ariaLabel="Graph of the functions"
                ariaDescription={`${fns.map((f) => f.label).join('; ') || 'No functions'}, for x from ${fmt(domain[0])} to ${fmt(domain[1])}. Drag to pan, scroll to zoom.`}
              />
            </Stack>
          </ChartFrame>
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
