import { SelectionFrame, type FrameBox } from '@arshad-shah/cynosure';
import type React from 'react';
import { useEffect, useId, useLayoutEffect, useRef } from 'react';
import './raster-stage.css';

/** A pointer gesture on the image, in canvas pixels. */
export interface StagePointer {
  phase: 'start' | 'move' | 'end' | 'cancel';
  x: number;
  y: number;
  /** 0..1; a mouse or finger reports 0.5. */
  pressure: number;
  shiftKey: boolean;
}

/** The selected object's frame (Cynosure SelectionFrame), canvas pixels. */
export interface StageFrame {
  /** Accessible name, e.g. "Arrow 1". */
  label: string;
  box: FrameBox;
  keepAspect?: boolean;
  resizable?: boolean;
  minSize?: number;
  /** Keep the box inside the canvas. */
  bounded?: boolean;
  onChange?(box: FrameBox): void;
  onCommit(box: FrameBox): void;
}

export interface RasterStageProps {
  /** Names the image (role img), e.g. "Image being edited, 800 by 600". */
  label: string;
  /** Read after the label: the keys and what the object list offers. */
  description?: string;
  /** Canvas size in its own pixels. */
  width: number;
  height: number;
  /** CSS pixels per canvas pixel (the zoom). */
  scale: number;
  /** Redraws the canvas; called again whenever it changes. */
  paint(ctx: CanvasRenderingContext2D): void;
  cursor?: 'crosshair' | 'default' | 'text' | 'move';
  /** Pointer gestures (pointer only: pair every use with a keyboard path). */
  onPointer?(e: StagePointer): void;
  frame?: StageFrame | null;
  /** Delete or Backspace while the frame has focus. */
  onDelete?(): void;
  /** The room to fit the image into, CSS pixels: the width and the cap. */
  onViewport?(size: { width: number; height: number }): void;
  /** Each new value moves focus to the frame (after a keyboard placement). */
  focusFrameKey?: number;
  'data-testid'?: string;
}

/**
 * A raster drawing surface: a canvas at the image's own resolution, shown
 * at a zoom inside a scrolling viewport, with the selected object's frame
 * over it. The page owns the document and paints it; this turns pointer
 * presses into canvas-pixel gestures and hosts the keyboard-operable frame.
 */
export function RasterStage({
  label,
  description,
  width,
  height,
  scale,
  paint,
  cursor = 'default',
  onPointer,
  frame,
  onDelete,
  onViewport,
  focusFrameKey,
  'data-testid': testId,
}: RasterStageProps) {
  const viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!focusFrameKey) return;
    viewport.current
      ?.querySelector<HTMLElement>('.cy-selection-frame')
      ?.focus();
  }, [focusFrameKey]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pointerId = useRef<number | null>(null);
  const descId = useId();
  const latestViewport = useRef(onViewport);
  useEffect(() => {
    latestViewport.current = onViewport;
  });

  useLayoutEffect(() => {
    const ctx = canvas.current?.getContext('2d', { willReadFrequently: true });
    if (ctx) paint(ctx);
  }, [paint, width, height]);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    // The height to fit into is the stage's cap: its own height follows
    // the content, so fitting to it would shrink the image step by step.
    const report = () => {
      const cap = parseFloat(getComputedStyle(el).maxHeight);
      latestViewport.current?.({
        width: el.clientWidth,
        height: Number.isFinite(cap) ? cap : el.clientHeight,
      });
    };
    report();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const toCanvas = (e: React.PointerEvent, phase: StagePointer['phase']) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      phase,
      x: (e.clientX - r.left) / scale,
      y: (e.clientY - r.top) / scale,
      pressure: e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.5,
      shiftKey: e.shiftKey,
    };
  };

  const cssWidth = width * scale;
  const cssHeight = height * scale;
  return (
    <div
      ref={viewport}
      className="tools-raster-stage"
      data-testid={testId}
      onKeyDown={(e) => {
        if (
          (e.key === 'Delete' || e.key === 'Backspace') &&
          (e.target as HTMLElement).classList.contains('cy-selection-frame')
        ) {
          e.preventDefault();
          onDelete?.();
        }
      }}
    >
      <div
        className="tools-raster-stage-content"
        style={{ width: cssWidth, height: cssHeight }}
      >
        <canvas
          ref={canvas}
          className="tools-raster-stage-canvas"
          role="img"
          aria-label={label}
          aria-describedby={description ? descId : undefined}
          width={width}
          height={height}
          style={{ width: cssWidth, height: cssHeight }}
          data-cursor={cursor}
          onPointerDown={(e) => {
            if (e.button !== 0 || !onPointer) return;
            pointerId.current = e.pointerId;
            e.currentTarget.setPointerCapture?.(e.pointerId);
            onPointer(toCanvas(e, 'start'));
          }}
          onPointerMove={(e) => {
            if (pointerId.current === e.pointerId)
              onPointer?.(toCanvas(e, 'move'));
          }}
          onPointerUp={(e) => {
            if (pointerId.current !== e.pointerId) return;
            pointerId.current = null;
            onPointer?.(toCanvas(e, 'end'));
          }}
          onPointerCancel={(e) => {
            if (pointerId.current !== e.pointerId) return;
            pointerId.current = null;
            onPointer?.(toCanvas(e, 'cancel'));
          }}
        />
        {description ? (
          <span id={descId} hidden>
            {description}
          </span>
        ) : null}
        {frame ? (
          <div className="tools-raster-stage-layer">
            <SelectionFrame
              label={frame.label}
              box={frame.box}
              scale={scale}
              resizable={frame.resizable ?? true}
              keepAspect={frame.keepAspect}
              minSize={frame.minSize ?? 1}
              bounds={frame.bounded ? { width, height } : undefined}
              step={1}
              largeStep={10}
              compactBelow={24}
              aria-describedby={description ? descId : undefined}
              onChange={(b) => frame.onChange?.(b)}
              onCommit={(b) => frame.onCommit(b)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
RasterStage.displayName = 'RasterStage';
