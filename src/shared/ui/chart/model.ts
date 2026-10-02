/**
 * The chart model: shapes from model-kinds.ts placed on a pixel layout with
 * scales, ticks and formatters. Pure (a text measurer is passed in), so the
 * painter, the SVG export and hit testing all read the same numbers.
 */
import { lttb } from './lttb';
import {
  buildDraft,
  type Draft,
  type DraftInput,
  type LineLayer,
} from './model-kinds';
import { adaptiveSample } from './sampling';
import { extent, linearScale, type Scale } from './scales';
import {
  innerTicks,
  niceTicks,
  numberFormatter,
  pickTimeInterval,
  timeFormatter,
  timeTicks,
} from './ticks';
import type { ChartFunction, ChartView, XValue } from './types';

export type { LineLayer, RectShape, LinePoint } from './model-kinds';

export interface ModelInput extends DraftInput {
  fns: ChartFunction[];
  /** Function x range. Default [-10, 10]. */
  xDomain?: [number, number];
  xLabel?: string;
  yLabel?: string;
  formatX?: (x: XValue) => string;
  formatY?: (y: number) => string;
}

export interface Tick {
  v: number;
  label: string;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Model extends Draft {
  kind: ModelInput['kind'];
  width: number;
  height: number;
  plot: Rect;
  xs: Scale;
  ys: Scale;
  xTicks: Tick[];
  yTicks: Tick[];
  xLabel?: string;
  yLabel?: string;
  /** Unzoomed domains, for reset and zoom limits. */
  fullX: [number, number];
  fullY: [number, number];
  /** Pan and zoom apply (numeric axes, not heatmaps). */
  zoomable: boolean;
  formatX(v: number): string;
  formatY(v: number): string;
  /** Finer formatters for the hover readout. */
  readX(v: number): string;
  readY(v: number): string;
}

export const FONT_PX = 11;
const AXIS_TITLE = 16;
const FN_DEFAULT: [number, number] = [-10, 10];

function sampleFunctions(
  fns: ChartFunction[],
  [a, b]: [number, number],
  heightPx: number,
): { layers: LineLayer[]; y: [number, number] | null } {
  const coarse: number[] = [];
  const layers = fns.map((f, i): LineLayer => {
    for (let k = 0; k <= 64; k++) coarse.push(f.fn(a + ((b - a) * k) / 64));
    const pts = adaptiveSample(f.fn, [a, b], { heightPx }).map((p) => ({
      ...p,
      base: 0,
      i: -1,
    }));
    return {
      id: f.id,
      label: f.label,
      color: i,
      mode: 'line',
      pts,
      source: [],
    };
  });
  return { layers, y: extent(coarse) };
}

/** Splits at nulls, downsamples each run, and keeps the breaks. */
function downsample(layer: LineLayer, max: number): LineLayer {
  if (layer.pts.length <= max || layer.mode === 'scatter') return layer;
  const out: LineLayer['pts'] = [];
  let run: { x: number; y: number; p: LineLayer['pts'][number] }[] = [];
  const total = layer.pts.length;
  const flush = () => {
    if (run.length) {
      const keep = Math.max(2, Math.round((run.length / total) * max));
      for (const r of lttb(run, keep)) out.push(r.p);
    }
    run = [];
  };
  for (const p of layer.pts) {
    if (p.y === null) {
      flush();
      out.push(p);
    } else run.push({ x: p.x, y: p.y, p });
  }
  flush();
  return { ...layer, pts: out };
}

const pad = ([a, b]: [number, number]): [number, number] =>
  a === b
    ? [
        a - (a === 0 ? 1 : Math.abs(a) * 0.1),
        b + (b === 0 ? 1 : Math.abs(b) * 0.1),
      ]
    : [a, b];

export function buildModel(
  input: ModelInput,
  size: { width: number; height: number },
  view: ChartView | null,
  measure: (text: string) => number,
): Model {
  const { width, height } = size;
  const top = 8;
  const bottom = 22 + (input.xLabel ? AXIS_TITLE : 0);
  const plotH = Math.max(10, height - top - bottom);

  let draft: Draft;
  if (input.kind === 'function') {
    const range = input.xDomain ?? FN_DEFAULT;
    const xr = view?.x ?? range;
    const { layers, y } = sampleFunctions(input.fns, xr, plotH);
    draft = {
      xType: 'linear',
      lines: layers,
      rects: [],
      categories: [],
      x: range,
      y,
    };
  } else draft = buildDraft(input);

  const heat = input.kind === 'heatmap';
  const zoomable = !heat;
  const fullX = pad(draft.x ?? [0, 1]);
  const yCount = Math.max(2, Math.floor(plotH / 50));
  let fullY: [number, number];
  if (heat) fullY = draft.y ?? [0, 1];
  else {
    const t = niceTicks(...pad(draft.y ?? [0, 1]), yCount);
    fullY = [t[0], t[t.length - 1]];
  }
  const xDom = (zoomable && view?.x) || fullX;
  const yDom = (zoomable && view?.y) || fullY;

  // y ticks first: their label width sets the left margin.
  const yt = niceTicks(yDom[0], yDom[1], yCount);
  const yStep = (yt[1] ?? 1) - (yt[0] ?? 0);
  const formatY = input.formatY ?? numberFormatter(yStep);
  const readY = input.formatY ?? numberFormatter(yStep / 100);
  const yTicks: Tick[] = heat
    ? (draft.grid?.rowLabels ?? []).map((label, v) => ({ v, label }))
    : innerTicks(yDom[0], yDom[1], yCount).map((v) => ({
        v,
        label: formatY(v),
      }));
  const labelW = Math.max(0, ...yTicks.map((t) => measure(t.label)));
  const left = Math.ceil(labelW) + 10 + (input.yLabel ? AXIS_TITLE : 0);
  const right = 12;
  const plot: Rect = {
    x: left,
    y: top,
    w: Math.max(10, width - left - right),
    h: plotH,
  };
  const xs = linearScale(xDom, [plot.x, plot.x + plot.w]);
  const ys = heat
    ? linearScale(yDom, [plot.y, plot.y + plot.h])
    : linearScale(yDom, [plot.y + plot.h, plot.y]);

  const xCount = Math.max(2, Math.floor(plot.w / 90));
  let formatX: (v: number) => string;
  let readX: ((v: number) => string) | undefined;
  let xTicks: Tick[];
  if (heat) {
    formatX = (v) => String(v);
    xTicks = (draft.grid?.colLabels ?? []).map((c) => ({
      v: c.at,
      label: c.label,
    }));
  } else if (draft.xType === 'band') {
    const cat = (v: number) => draft.categories[Math.round(v)] ?? '';
    formatX = input.formatX ? (v) => input.formatX!(cat(v)) : cat;
    const lo = Math.max(0, Math.ceil(xDom[0]));
    const hi = Math.min(draft.categories.length - 1, Math.floor(xDom[1]));
    const every = Math.max(
      1,
      Math.ceil((hi - lo + 1) / Math.max(1, Math.floor(plot.w / 60))),
    );
    xTicks = [];
    for (let v = lo; v <= hi; v += every) xTicks.push({ v, label: formatX(v) });
  } else if (draft.xType === 'time') {
    const iv = pickTimeInterval(xDom[0], xDom[1], xCount);
    const f = timeFormatter(iv.unit);
    formatX = input.formatX ? (v) => input.formatX!(new Date(v)) : f;
    const full = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: iv.unit === 'second' ? 'medium' : 'short',
    });
    readX = input.formatX ? formatX : (v) => full.format(new Date(v));
    xTicks = timeTicks(xDom[0], xDom[1], xCount, iv).map((v) => ({
      v,
      label: formatX(v),
    }));
  } else {
    const t = innerTicks(xDom[0], xDom[1], xCount);
    const f = numberFormatter((t[1] ?? 1) - (t[0] ?? 0));
    formatX = input.formatX ? (v) => input.formatX!(v) : f;
    const step = (t[1] ?? 1) - (t[0] ?? 0);
    readX = input.formatX ? formatX : numberFormatter(step / 100);
    xTicks = t.map((v) => ({ v, label: formatX(v) }));
  }

  const maxPts = Math.max(500, Math.round(plot.w * 2));
  return {
    ...draft,
    lines: input.stacked
      ? draft.lines
      : draft.lines.map((l) => downsample(l, maxPts)),
    kind: input.kind,
    width,
    height,
    plot,
    xs,
    ys,
    xTicks,
    yTicks,
    xLabel: input.xLabel,
    yLabel: input.yLabel,
    fullX,
    fullY,
    zoomable,
    formatX,
    formatY,
    readX: readX ?? formatX,
    readY,
  };
}
