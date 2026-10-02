/**
 * Kit chart on a kit-owned canvas: line, area, bar, scatter, histogram,
 * heatmap and function plots on theme tokens, with a hover readout, an
 * optional brush, pan and zoom, PNG and SVG export, and a data table as
 * the accessible alternative.
 *
 * Accessibility: the canvas is `role="img"` named by `ariaLabel` and
 * described by `ariaSummary`. When `zoomable`, the keyboard handler lives on
 * a separate focusable group ("<ariaLabel> zoom and pan") around it, so the
 * image itself is not an interactive control.
 */
import React, {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '@/shared/lib/cn';
import { ToolError } from '@/shared/lib/errors';
import { watchTheme } from '@/shared/lib/theme-tokens';
import { Button } from '../button';
import { Switch } from '../controls';
import { Label } from '../typography';
import { ChartLegend, ChartTooltip, HeatLegend } from './chart-parts';
import { ChartTable } from './chart-table';
import { textMeasurer } from './measure';
import { buildModel, type Model, type ModelInput } from './model';
import { paintChart } from './paint';
import { toSvg } from './svg';
import { readChartTheme } from './theme';
import type {
  ChartFunction,
  ChartHandle,
  ChartHover,
  ChartKind,
  ChartSeries,
  ChartView,
  HeatmapCell,
  XType,
  XValue,
} from './types';
import { useChartPointer } from './use-chart-pointer';
import { frameOf, keyView, zoomAt, type Frame } from './view';

export interface ChartProps {
  kind: ChartKind;
  /** Line, area, bar and scatter data; for a histogram, the y values are the samples. */
  series?: ChartSeries[];
  /** `kind="function"`: plotted with adaptive sampling. */
  fns?: ChartFunction[];
  /** `kind="function"`: the x range. Default [-10, 10]. */
  xDomain?: [number, number];
  /** `kind="heatmap"`. */
  cells?: HeatmapCell[];
  /** Heatmap as a calendar: one column per week, x is the date. */
  calendar?: boolean;
  /** Histogram bin count, or 'auto' for Freedman-Diaconis. */
  bins?: number | 'auto';
  stacked?: boolean;
  xType?: XType;
  /** CSS px. Default 260. */
  height?: number;
  ariaLabel: string;
  ariaSummary?: string;
  xLabel?: string;
  yLabel?: string;
  legend?: boolean;
  formatX?: (x: XValue) => string;
  formatY?: (y: number) => string;
  onPointHover?: (hover: ChartHover | null) => void;
  /** Wheel, drag, pinch and keyboard zoom and pan. */
  zoomable?: boolean;
  /** Drag selects an x range (Shift-drag pans instead); a click clears it. */
  brush?: (range: [number, number] | null) => void;
  className?: string;
  ref?: React.Ref<ChartHandle>;
}

const NONE: never[] = [];

export function Chart({
  kind,
  series = NONE,
  fns = NONE,
  xDomain,
  cells = NONE,
  calendar = false,
  bins = 'auto',
  stacked = false,
  xType,
  height = 260,
  ariaLabel,
  ariaSummary,
  xLabel,
  yLabel,
  legend = true,
  formatX,
  formatY,
  onPointHover,
  zoomable = false,
  brush,
  className,
  ref,
}: ChartProps) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const frame = useRef<Frame | null>(null);
  const summaryId = useId();
  const hintId = useId();
  const tableId = useId();
  const [width, setWidth] = useState(0);
  const [dpr, setDpr] = useState(1);
  const [theme, setTheme] = useState(readChartTheme);
  const [view, setView] = useState<ChartView | null>(null);
  const [showTable, setShowTable] = useState(false);
  const canZoom = zoomable && kind !== 'heatmap';

  // New data (or a new function range) drops any zoom.
  const dataKey = [kind, series, fns, cells, xDomain?.[0], xDomain?.[1]];
  const [seenKey, setSeenKey] = useState(dataKey);
  if (dataKey.some((v, i) => v !== seenKey[i])) {
    setSeenKey(dataKey);
    setView(null);
  }

  useEffect(() => watchTheme(() => setTheme(readChartTheme())), []);

  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      setWidth(Math.floor(el.getBoundingClientRect().width));
      setDpr(window.devicePixelRatio || 1);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const measure = useMemo(() => textMeasurer(theme.font), [theme.font]);

  const xd0 = xDomain?.[0];
  const xd1 = xDomain?.[1];
  const input = useMemo<ModelInput>(
    () => ({
      kind,
      series,
      fns,
      cells,
      calendar,
      bins,
      stacked,
      xType,
      // By value: callers often pass a fresh array literal.
      xDomain: xd0 !== undefined && xd1 !== undefined ? [xd0, xd1] : undefined,
      xLabel,
      yLabel,
      formatX,
      formatY,
    }),
    [
      kind,
      series,
      fns,
      cells,
      calendar,
      bins,
      stacked,
      xType,
      xd0,
      xd1,
      xLabel,
      yLabel,
      formatX,
      formatY,
    ],
  );

  const model = useMemo<Model | null>(
    () =>
      width > 0
        ? buildModel(input, { width, height }, canZoom ? view : null, measure)
        : null,
    [input, width, height, view, canZoom, measure],
  );
  useLayoutEffect(() => {
    frame.current = model ? frameOf(model) : null;
  }, [model]);

  const changeView = useCallback((v: ChartView | null) => {
    if (v && frame.current) frame.current = { ...frame.current, view: v };
    setView(v);
  }, []);

  const { hit, brushPx, handlers } = useChartPointer({
    model,
    zoomable: canZoom,
    brush,
    onView: changeView,
    onHover: onPointHover,
  });

  const paint = useCallback(
    (withOverlay: boolean) => {
      const cv = canvas.current;
      const ctx = cv?.getContext('2d');
      if (!cv || !ctx || !model) return;
      const w = Math.round(model.width * dpr);
      const h = Math.round(model.height * dpr);
      if (cv.width !== w) cv.width = w;
      if (cv.height !== h) cv.height = h;
      paintChart(
        ctx,
        model,
        theme,
        dpr,
        withOverlay
          ? { hoverX: hit?.crossX, markers: hit?.markers, brush: brushPx }
          : {},
      );
    },
    [model, theme, dpr, hit, brushPx],
  );

  useEffect(() => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      paint(true);
    });
    return () => cancelAnimationFrame(raf.current);
  }, [paint]);

  // React wheel listeners are passive; zooming must stop the page scroll.
  useEffect(() => {
    const el = canvas.current;
    if (!el || !canZoom) return;
    const onWheel = (e: WheelEvent) => {
      const f = frame.current;
      if (!f) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? f.plot.h : 1;
      const k = Math.exp(
        Math.max(-100, Math.min(100, e.deltaY * unit)) * 0.002,
      );
      changeView(zoomAt(f, e.clientX - r.left, e.clientY - r.top, k));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [canZoom, changeView]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const f = frame.current;
    if (!f || e.ctrlKey || e.metaKey || e.altKey) return;
    const next = keyView(f, e.key);
    if (next === undefined) return;
    e.preventDefault();
    changeView(next);
  };

  useImperativeHandle(
    ref,
    (): ChartHandle => ({
      exportPng: () =>
        new Promise<Blob>((resolve, reject) => {
          const cv = canvas.current;
          if (!cv || !model)
            return reject(
              new ToolError('UNKNOWN', 'The chart has not been drawn yet'),
            );
          paint(false);
          cv.toBlob((blob) => {
            paint(true);
            if (blob) resolve(blob);
            else
              reject(
                new ToolError('UNKNOWN', 'Could not export the chart as PNG'),
              );
          }, 'image/png');
        }),
      exportSvg: () => {
        if (kind === 'scatter' || kind === 'heatmap')
          throw new ToolError(
            'UNSUPPORTED_FEATURE',
            'SVG export covers line, area and bar charts',
          );
        const m =
          model ?? buildModel(input, { width: 640, height }, null, measure);
        return toSvg(m, theme);
      },
      resetView: () => changeView(null),
    }),
    [kind, model, input, height, measure, theme, paint, changeView],
  );

  const interactive = canZoom || !!brush;
  const image = (
    <canvas
      ref={canvas}
      role="img"
      aria-label={ariaLabel}
      aria-describedby={ariaSummary ? summaryId : undefined}
      data-testid="chart-canvas"
      className={cn(
        'block w-full cursor-crosshair select-none',
        interactive && 'touch-none',
      )}
      style={{ height }}
      {...handlers}
    />
  );
  const legendItems =
    kind === 'function' ? fns : kind === 'heatmap' ? [] : series;

  return (
    <div className={cn('flex w-full min-w-0 flex-col gap-2', className)}>
      <div ref={box} className="relative w-full">
        {canZoom ? (
          <div
            role="group"
            aria-label={`${ariaLabel} zoom and pan`}
            aria-describedby={hintId}
            tabIndex={0}
            onKeyDown={onKeyDown}
            className="rounded-md outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {image}
          </div>
        ) : (
          image
        )}
        {hit && model ? <ChartTooltip hit={hit} width={model.width} /> : null}
      </div>
      {ariaSummary ? (
        <p id={summaryId} className="sr-only">
          {ariaSummary}
        </p>
      ) : null}
      {canZoom ? (
        <p id={hintId} className="sr-only">
          Plus and minus zoom, the arrow keys pan and 0 resets the view.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {legend && kind === 'heatmap' && model?.grid ? (
          <HeatLegend
            min={model.grid.min}
            max={model.grid.max}
            calendar={calendar}
            format={formatY ?? String}
          />
        ) : legend && legendItems.length > 0 ? (
          <ChartLegend items={legendItems} />
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          {view && canZoom ? (
            <Button size="sm" variant="ghost" onClick={() => changeView(null)}>
              Reset zoom
            </Button>
          ) : null}
          <div className="flex items-center gap-2">
            <Switch
              id={tableId}
              checked={showTable}
              onCheckedChange={setShowTable}
            />
            <Label htmlFor={tableId}>Show data table</Label>
          </div>
        </div>
      </div>
      {showTable ? (
        <ChartTable
          kind={kind}
          caption={`${ariaLabel}: data`}
          series={series}
          fns={fns}
          cells={cells}
          calendar={calendar}
          model={model}
          xLabel={xLabel}
          formatX={formatX}
          formatY={formatY}
        />
      ) : null}
    </div>
  );
}
Chart.displayName = 'Chart';
