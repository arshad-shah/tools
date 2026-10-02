/**
 * Pointer interaction for the chart canvas: hover readout, brush, drag pan
 * and two-pointer pinch. Pans and pinches are computed from the frame at
 * gesture start, so they stay exact however often React re-renders.
 */
import React, { useRef, useState } from 'react';
import { hitTest, type Hit } from './hit';
import type { Model } from './model';
import type { ChartHover, ChartView } from './types';
import { frameOf, panBy, zoomAt, type Frame } from './view';

interface Gesture {
  mode: 'brush' | 'pan' | 'pinch' | 'none';
  start: { x: number; y: number };
  frame: Frame;
  dist?: number;
  mid?: { x: number; y: number };
}

export interface ChartPointerArgs {
  model: Model | null;
  zoomable: boolean;
  brush?: (range: [number, number] | null) => void;
  onView(view: ChartView): void;
  onHover?: (hover: ChartHover | null) => void;
  /** A click (press and release without a drag) on a point. */
  onPointClick?: (point: ChartHover) => void;
}

const sameHover = (a: ChartHover | null, b: ChartHover | null) =>
  a === b || (!!a && !!b && a.seriesId === b.seriesId && a.index === b.index);

export function useChartPointer({
  model,
  zoomable,
  brush,
  onView,
  onHover,
  onPointClick,
}: ChartPointerArgs) {
  const [hit, setHit] = useState<Hit | null>(null);
  const [brushPx, setBrushPx] = useState<[number, number] | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  const lastHover = useRef<ChartHover | null>(null);

  const hover = (next: Hit | null) => {
    setHit(next);
    const h = next?.hover ?? null;
    if (!sameHover(h, lastHover.current)) {
      lastHover.current = h;
      onHover?.(h);
    }
  };

  const local = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const pinchOf = () => {
    const [a, b] = [...pointers.current.values()];
    return {
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (!model || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const frame = frameOf(model);
    if (pointers.current.size === 2 && zoomable) {
      setBrushPx(null);
      gesture.current = { mode: 'pinch', start: p, frame, ...pinchOf() };
    } else if (pointers.current.size === 1) {
      const mode = brush && !e.shiftKey ? 'brush' : zoomable ? 'pan' : 'none';
      gesture.current = { mode, start: p, frame };
    }
    hover(null);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!model) return;
    const p = local(e);
    const g = gesture.current;
    if (!g || !pointers.current.has(e.pointerId)) {
      hover(hitTest(model, p.x, p.y));
      return;
    }
    pointers.current.set(e.pointerId, p);
    if (g.mode === 'brush') {
      const { plot } = model;
      const clamp = (x: number) =>
        Math.min(plot.x + plot.w, Math.max(plot.x, x));
      setBrushPx([clamp(g.start.x), clamp(p.x)]);
    } else if (g.mode === 'pan') {
      onView(panBy(g.frame, p.x - g.start.x, p.y - g.start.y));
    } else if (g.mode === 'pinch' && pointers.current.size === 2) {
      const { dist } = pinchOf();
      onView(zoomAt(g.frame, g.mid!.x, g.mid!.y, g.dist! / dist));
    }
  };

  const end = (e: React.PointerEvent<HTMLElement>) => {
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (pointers.current.size > 0) {
      // One finger left after a pinch: carry on as a pan from here.
      if (g?.mode === 'pinch' && model) {
        const [rest] = [...pointers.current.values()];
        gesture.current = {
          mode: zoomable ? 'pan' : 'none',
          start: rest,
          frame: frameOf(model),
        };
      }
      return;
    }
    gesture.current = null;
    if (
      g &&
      g.mode !== 'pinch' &&
      model &&
      onPointClick &&
      e.type === 'pointerup'
    ) {
      const p = local(e);
      const hit = Math.hypot(p.x - g.start.x, p.y - g.start.y) < 3;
      // A bar is hit anywhere in its column: retry at the baseline.
      const bottom = model.plot.y + model.plot.h - 1;
      const target = hit
        ? (hitTest(model, p.x, p.y) ?? hitTest(model, p.x, bottom))
        : null;
      if (target) onPointClick(target.hover);
    }
    if (g?.mode === 'brush' && model && e.type === 'pointerup') {
      const p = local(e);
      const { plot } = model;
      const clamp = (x: number) =>
        Math.min(plot.x + plot.w, Math.max(plot.x, x));
      const a = clamp(g.start.x);
      const b = clamp(p.x);
      if (Math.abs(b - a) >= 3) {
        const x0 = model.xs.invert(Math.min(a, b));
        const x1 = model.xs.invert(Math.max(a, b));
        brush?.([x0, x1]);
      } else brush?.(null);
    }
    setBrushPx(null);
  };

  const onPointerLeave = () => {
    if (!gesture.current) hover(null);
  };

  return {
    hit,
    brushPx,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: end,
      onPointerCancel: end,
      onPointerLeave,
    },
  };
}
