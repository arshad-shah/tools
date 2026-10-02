/**
 * Canvas painter for the chart model. Coordinates are CSS px; the context
 * is scaled by the device pixel ratio and hairlines and bar edges snap to
 * the device pixel grid.
 */
import { FONT_PX, type Model } from './model';
import type { LinePoint } from './model-kinds';
import { snap } from './scales';
import { seriesColor, type ChartTheme } from './theme';

export interface Overlay {
  /** Crosshair x in CSS px. */
  hoverX?: number | null;
  /** Highlighted points in CSS px. */
  markers?: { x: number; y: number; color: number }[];
  /** Brush selection between two CSS px x positions. */
  brush?: [number, number] | null;
}

type Ctx = CanvasRenderingContext2D;

/** Polyline through the points, lifting the pen at each null. */
export function tracePath(
  ctx: Pick<Ctx, 'moveTo' | 'lineTo'>,
  pts: LinePoint[],
  px: (p: LinePoint) => [number, number],
): void {
  let down = false;
  for (const p of pts) {
    if (p.y === null) {
      down = false;
      continue;
    }
    const [x, y] = px(p);
    if (down) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
    down = true;
  }
}

/** Runs of consecutive non-null points. */
export function runs(pts: LinePoint[]): LinePoint[][] {
  const out: LinePoint[][] = [];
  let cur: LinePoint[] = [];
  for (const p of pts) {
    if (p.y === null) {
      if (cur.length) out.push(cur);
      cur = [];
    } else cur.push(p);
  }
  if (cur.length) out.push(cur);
  return out;
}

function axes(ctx: Ctx, m: Model, t: ChartTheme, dpr: number) {
  const { plot } = m;
  const heat = m.kind === 'heatmap';
  ctx.lineWidth = 1 / dpr;
  ctx.strokeStyle = t.grid;
  if (!heat) {
    ctx.beginPath();
    for (const tick of m.yTicks) {
      const y = snap(m.ys.map(tick.v), dpr, true);
      ctx.moveTo(plot.x, y);
      ctx.lineTo(plot.x + plot.w, y);
    }
    const base = snap(plot.y + plot.h, dpr, true);
    ctx.moveTo(plot.x, base);
    ctx.lineTo(plot.x + plot.w, base);
    ctx.stroke();
  }
  ctx.fillStyle = t.muted;
  ctx.font = `${FONT_PX}px ${t.font}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const tick of m.yTicks) {
    if (!tick.label) continue;
    ctx.fillText(tick.label, plot.x - 6, m.ys.map(tick.v));
  }
  ctx.textAlign = heat ? 'left' : 'center';
  ctx.textBaseline = 'top';
  for (const tick of m.xTicks) {
    const x = heat ? m.xs.map(tick.v - 0.45) : m.xs.map(tick.v);
    ctx.fillText(tick.label, x, plot.y + plot.h + 6);
  }
  if (m.xLabel) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(m.xLabel, plot.x + plot.w / 2, m.height - 2);
  }
  if (m.yLabel) {
    ctx.save();
    ctx.translate(2, plot.y + plot.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(m.yLabel, 0, 0);
    ctx.restore();
  }
}

function shapes(ctx: Ctx, m: Model, t: ChartTheme, dpr: number) {
  for (const r of m.rects) {
    const x0 = snap(m.xs.map(r.x0), dpr);
    const x1 = snap(m.xs.map(r.x1), dpr);
    const ya = snap(m.ys.map(r.y0), dpr);
    const yb = snap(m.ys.map(r.y1), dpr);
    ctx.globalAlpha = r.alpha;
    ctx.fillStyle = r.color < 0 ? t.grid : seriesColor(t, r.color);
    ctx.fillRect(
      Math.min(x0, x1),
      Math.min(ya, yb),
      Math.max(1 / dpr, Math.abs(x1 - x0)),
      Math.abs(yb - ya),
    );
  }
  ctx.globalAlpha = 1;
  const at = (p: LinePoint): [number, number] => [
    m.xs.map(p.x),
    m.ys.map(p.y ?? 0),
  ];
  for (const l of m.lines) {
    const color = seriesColor(t, l.color);
    if (l.mode === 'scatter') {
      ctx.fillStyle = color;
      for (const p of l.pts) {
        if (p.y === null) continue;
        const [x, y] = at(p);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      continue;
    }
    if (l.mode === 'area') {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.18;
      for (const run of runs(l.pts)) {
        ctx.beginPath();
        run.forEach((p, i) => {
          const [x, y] = at(p);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        for (let i = run.length - 1; i >= 0; i--)
          ctx.lineTo(m.xs.map(run[i].x), m.ys.map(run[i].base));
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    tracePath(ctx, l.pts, at);
    ctx.stroke();
  }
}

function overlay(ctx: Ctx, m: Model, t: ChartTheme, dpr: number, o: Overlay) {
  const { plot } = m;
  if (o.brush) {
    const [a, b] = o.brush;
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = t.accent;
    ctx.fillRect(Math.min(a, b), plot.y, Math.abs(b - a), plot.h);
    ctx.globalAlpha = 1;
  }
  if (o.hoverX !== null && o.hoverX !== undefined) {
    const x = snap(o.hoverX, dpr, true);
    ctx.strokeStyle = t.muted;
    ctx.lineWidth = 1 / dpr;
    ctx.beginPath();
    ctx.moveTo(x, plot.y);
    ctx.lineTo(x, plot.y + plot.h);
    ctx.stroke();
  }
  for (const mk of o.markers ?? []) {
    ctx.beginPath();
    ctx.arc(mk.x, mk.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = seriesColor(t, mk.color);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = t.surface;
    ctx.stroke();
  }
}

export function paintChart(
  ctx: Ctx,
  m: Model,
  t: ChartTheme,
  dpr: number,
  o: Overlay = {},
): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, m.width, m.height);
  axes(ctx, m, t, dpr);
  ctx.save();
  ctx.beginPath();
  ctx.rect(m.plot.x, m.plot.y, m.plot.w, m.plot.h);
  ctx.clip();
  shapes(ctx, m, t, dpr);
  overlay(ctx, m, t, dpr, o);
  ctx.restore();
}
