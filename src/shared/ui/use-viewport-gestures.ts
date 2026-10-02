import React from 'react';

export const MIN_PERCENT = 25;
export const MAX_PERCENT = 800;

export const clampPercent = (p: number) =>
  Math.round(Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, p)));

/** Where a zoom was centred, in px from the viewport's top-left corner. */
export interface ZoomAnchor {
  x: number;
  y: number;
}

/**
 * Zoom and pan gestures for a scroll container: Ctrl/Cmd+wheel and a
 * two-pointer pinch zoom around the pointer; Space+drag pans.
 */
export function useViewportGestures(
  ref: React.RefObject<HTMLElement | null>,
  percent: number,
  onZoom: (percent: number, anchor: ZoomAnchor | null) => void,
) {
  const latest = React.useRef({ percent, onZoom });
  React.useLayoutEffect(() => {
    latest.current = { percent, onZoom };
  });
  const [spaceHeld, setSpaceHeld] = React.useState(false);
  const pointers = React.useRef(new Map<number, { x: number; y: number }>());
  const pinch = React.useRef<{ dist: number; percent: number } | null>(null);
  const pan = React.useRef<{ x: number; y: number } | null>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      // Browser zoom must not happen on top of ours.
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const { percent: p, onZoom: zoom } = latest.current;
      const next = clampPercent(p * Math.exp(-e.deltaY * 0.0015));
      if (next !== p)
        zoom(next, { x: e.clientX - r.left, y: e.clientY - r.top });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [ref]);

  const distance = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const handlers = {
    onKeyDown(e: React.KeyboardEvent<HTMLElement>) {
      if (e.key !== ' ' || e.target !== e.currentTarget) return;
      e.preventDefault();
      if (!spaceHeld) setSpaceHeld(true);
    },
    onKeyUp(e: React.KeyboardEvent<HTMLElement>) {
      if (e.key === ' ') setSpaceHeld(false);
    },
    onBlur() {
      setSpaceHeld(false);
    },
    onPointerDown(e: React.PointerEvent<HTMLElement>) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 2) {
        pinch.current = { dist: distance(), percent: latest.current.percent };
        pan.current = null;
      } else if (spaceHeld && e.button === 0) {
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        pan.current = { x: e.clientX, y: e.clientY };
      }
    },
    onPointerMove(e: React.PointerEvent<HTMLElement>) {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const el = ref.current;
      if (pinch.current && pointers.current.size === 2 && el) {
        const start = pinch.current;
        const next = clampPercent(
          (start.percent * distance()) / (start.dist || 1),
        );
        const r = el.getBoundingClientRect();
        const [a, b] = [...pointers.current.values()];
        if (next !== latest.current.percent)
          latest.current.onZoom(next, {
            x: (a.x + b.x) / 2 - r.left,
            y: (a.y + b.y) / 2 - r.top,
          });
      } else if (pan.current && el) {
        el.scrollLeft -= e.clientX - pan.current.x;
        el.scrollTop -= e.clientY - pan.current.y;
        pan.current = { x: e.clientX, y: e.clientY };
      }
    },
    onPointerUp(e: React.PointerEvent<HTMLElement>) {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) pinch.current = null;
      if (pan.current) {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
        pan.current = null;
      }
    },
    onPointerCancel(e: React.PointerEvent<HTMLElement>) {
      pointers.current.delete(e.pointerId);
      pinch.current = null;
      pan.current = null;
    },
  };

  return { handlers, panning: spaceHeld };
}
