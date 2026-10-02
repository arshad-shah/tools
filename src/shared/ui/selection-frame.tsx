import React from 'react';
import { cn } from '@/shared/lib/cn';
import { Positioned } from './positioned';
import {
  mapBox,
  type OverlayTransform,
  type PageSpaceBox,
} from './overlay-geometry';
import {
  angleTo,
  moveByPointer,
  nudge,
  resizeByHandle,
  resizeByKey,
  type HandleName,
} from './selection-math';

type Box = PageSpaceBox;

export interface SelectionFrameProps {
  transform: OverlayTransform;
  box: Box;
  rotate?: number;
  resizable?: boolean;
  rotatable?: boolean;
  keepAspect?: boolean;
  /** e.g. snap to cell edges. */
  snap?: (box: Box) => Box;
  /** During a drag or key repeat (preview). */
  onChange(box: Box, rotate: number): void;
  /** Pointer up / key up / Enter: one undo step. */
  onCommit(box: Box, rotate: number): void;
  /** e.g. "Text box: Hello". */
  label: string;
}

const HANDLES: { name: HandleName; className: string }[] = [
  { name: 'nw', className: '-left-1.5 -top-1.5 cursor-nwse-resize' },
  { name: 'n', className: 'left-1/2 -top-1.5 -ml-1.5 cursor-ns-resize' },
  { name: 'ne', className: '-right-1.5 -top-1.5 cursor-nesw-resize' },
  { name: 'e', className: '-right-1.5 top-1/2 -mt-1.5 cursor-ew-resize' },
  { name: 'se', className: '-bottom-1.5 -right-1.5 cursor-nwse-resize' },
  { name: 's', className: '-bottom-1.5 left-1/2 -ml-1.5 cursor-ns-resize' },
  { name: 'sw', className: '-bottom-1.5 -left-1.5 cursor-nesw-resize' },
  { name: 'w', className: '-left-1.5 top-1/2 -mt-1.5 cursor-ew-resize' },
];

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

type Gesture =
  | { kind: 'move'; x: number; y: number }
  | { kind: 'resize'; handle: HandleName; x: number; y: number }
  | { kind: 'rotate'; cx: number; cy: number };

interface Live {
  box: Box;
  rotate: number;
  start: { box: Box; rotate: number };
}

/**
 * Move, resize and rotate handles for one selected overlay object. React
 * owns the geometry (page space); pointer gestures use pointer capture and
 * the keyboard model follows R13 (no library keyboard mode):
 * arrows nudge 1pt (Shift 10pt), Alt+arrows resize 1pt (Shift 10pt),
 * [ and ] rotate 15 degrees, Enter commits, Esc cancels to the start box.
 */
export function SelectionFrame({
  transform,
  box,
  rotate = 0,
  resizable = false,
  rotatable = false,
  keepAspect = false,
  snap,
  onChange,
  onCommit,
  label,
}: SelectionFrameProps) {
  const [live, setLive] = React.useState<Live | null>(null);
  const liveRef = React.useRef<Live | null>(null);
  const gesture = React.useRef<Gesture | null>(null);
  const frameRef = React.useRef<HTMLDivElement>(null);

  const shown = live ?? { box, rotate };

  const update = (next: Live | null) => {
    liveRef.current = next;
    setLive(next);
  };

  const change = (nextBox: Box, nextRotate: number) => {
    const cur = liveRef.current;
    const start = cur?.start ?? { box, rotate };
    const snapped = snap ? snap(nextBox) : nextBox;
    update({ box: snapped, rotate: nextRotate, start });
    onChange(snapped, nextRotate);
  };

  const commit = () => {
    const cur = liveRef.current;
    if (!cur) return;
    update(null);
    onCommit(cur.box, cur.rotate);
  };

  const cancel = () => {
    const cur = liveRef.current;
    gesture.current = null;
    if (!cur) return;
    update(null);
    onChange(cur.start.box, cur.start.rotate);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const cur = liveRef.current ?? { box, rotate };
    const step = e.shiftKey ? 10 : 1;
    if (e.key === 'Escape') {
      if (!liveRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      cancel();
      return;
    }
    if (e.key === 'Enter') {
      if (!liveRef.current) return;
      e.preventDefault();
      commit();
      return;
    }
    if ((e.key === '[' || e.key === ']') && rotatable) {
      e.preventDefault();
      change(cur.box, cur.rotate + (e.key === ']' ? 15 : -15));
      return;
    }
    const dir = ARROWS[e.key];
    if (!dir) return;
    if (e.altKey) {
      // Alt+Left would otherwise navigate back.
      e.preventDefault();
      if (!resizable) return;
      const next = resizeByKey(transform, cur.box, e.key, step, keepAspect);
      if (next) change(next, cur.rotate);
      return;
    }
    e.preventDefault();
    change(nudge(transform, cur.box, dir[0], dir[1], step), cur.rotate);
  };

  const onKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (ARROWS[e.key] || e.key === '[' || e.key === ']') commit();
  };

  const begin = (e: React.PointerEvent<HTMLElement>, g: Gesture) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    frameRef.current?.focus({ preventScroll: true });
    gesture.current = g;
    update({ box, rotate, start: { box, rotate } });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const g = gesture.current;
    const cur = liveRef.current;
    if (!g || !cur) return;
    const { box: b0, rotate: r0 } = cur.start;
    if (g.kind === 'move')
      change(
        moveByPointer(transform, b0, e.clientX - g.x, e.clientY - g.y),
        r0,
      );
    else if (g.kind === 'resize')
      change(
        resizeByHandle(
          transform,
          b0,
          g.handle,
          e.clientX - g.x,
          e.clientY - g.y,
          keepAspect || e.shiftKey,
        ),
        r0,
      );
    else {
      const deg = angleTo(g.cx, g.cy, e.clientX, e.clientY);
      change(b0, e.shiftKey ? Math.round(deg / 15) * 15 : deg);
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (!gesture.current) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    gesture.current = null;
    commit();
  };

  // Handles capture the pointer; their moves bubble to the frame.
  const pointer = {
    onPointerMove,
    onPointerUp,
    onPointerCancel: () => cancel(),
  };

  const r = mapBox(transform, shown.box);
  return (
    <Positioned
      ref={frameRef}
      x={r.left}
      y={r.top}
      width={r.width}
      height={r.height}
      rotate={shown.rotate || undefined}
      role="group"
      aria-label={label}
      aria-roledescription="selection"
      tabIndex={0}
      data-testid="selection-frame"
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onPointerDown={(e) =>
        begin(e, { kind: 'move', x: e.clientX, y: e.clientY })
      }
      {...pointer}
      className="cursor-move touch-none outline outline-2 outline-accent-indicator focus-visible:outline-focus focus-visible:ring-4 focus-visible:ring-focus/30"
    >
      {resizable
        ? HANDLES.map((h) => (
            <span
              key={h.name}
              data-handle={h.name}
              aria-hidden
              onPointerDown={(e) =>
                begin(e, {
                  kind: 'resize',
                  handle: h.name,
                  x: e.clientX,
                  y: e.clientY,
                })
              }
              className={cn(
                'absolute size-3 rounded-sm border-2 border-accent-indicator bg-surface',
                h.className,
              )}
            />
          ))
        : null}
      {rotatable ? (
        <span
          data-handle="rotate"
          aria-hidden
          onPointerDown={(e) => {
            const f = frameRef.current?.getBoundingClientRect();
            if (!f) return;
            begin(e, {
              kind: 'rotate',
              cx: f.left + f.width / 2,
              cy: f.top + f.height / 2,
            });
          }}
          className="absolute -top-7 left-1/2 -ml-1.5 size-3 cursor-grab rounded-full border-2 border-accent-indicator bg-surface"
        />
      ) : null}
    </Positioned>
  );
}
SelectionFrame.displayName = 'SelectionFrame';
