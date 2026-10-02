import React, { useRef } from 'react';
import { cn } from '@/shared/lib/cn';
import { CHECKER_IMAGE, CHECKER_SIZE, colourPaint } from './swatch-paint';

export interface ColorRailProps {
  /** Accessible name. */
  label: string;
  value: number;
  min: number;
  max: number;
  /** Arrow-key step. Default 1. */
  step?: number;
  /** Shift+Arrow and PageUp/PageDown step. Default 10 steps. */
  bigStep?: number;
  /** aria-valuetext, for example "Hue 210 degrees". */
  valueText: string;
  /** CSS background-image painting the track. */
  track: string;
  /** Paints a checkerboard under the track (alpha rails). */
  checker?: boolean;
  /** Any CSS colour filling the thumb. */
  thumb: string;
  onChange(next: number): void;
  /**
   * The value is settled (pointer released, or a key handled). A key calls
   * only this when given, so a keystroke reports once.
   */
  onCommit?(next: number): void;
  className?: string;
}

/** Half the thumb: the thumb's centre stays this far inside each end. */
const INSET = 6;

/**
 * A dedicated colour-picker rail (hue, alpha): a 12px rounded gradient
 * track, a round thumb filled with the colour, pointer drag and the slider
 * keyboard (arrows step, Shift or Page keys step ten, Home and End).
 */
export function ColorRail({
  label,
  value,
  min,
  max,
  step = 1,
  bigStep = step * 10,
  valueText,
  track,
  checker = false,
  thumb,
  onChange,
  onCommit,
  className,
}: ColorRailProps) {
  const dragging = useRef(false);
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const span = max - min || 1;
  const t = (clamp(value) - min) / span;

  const fromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const usable = r.width - INSET * 2;
    if (usable <= 0) return value;
    const f = Math.min(1, Math.max(0, (e.clientX - r.left - INSET) / usable));
    return clamp(Math.round((min + f * span) / step) * step);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    e.currentTarget.focus();
    onChange(fromPointer(e));
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging.current) onChange(fromPointer(e));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    onCommit?.(fromPointer(e));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const d = e.shiftKey ? bigStep : step;
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = value + d;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = value - d;
    else if (e.key === 'PageUp') next = value + bigStep;
    else if (e.key === 'PageDown') next = value - bigStep;
    else if (e.key === 'Home') next = min;
    else if (e.key === 'End') next = max;
    if (next === null) return;
    e.preventDefault();
    (onCommit ?? onChange)(clamp(next));
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-orientation="horizontal"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragging.current = false;
      }}
      className={cn(
        'relative h-3 w-full cursor-pointer touch-none rounded-full outline-none',
        'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus',
        className,
      )}
      style={
        checker
          ? {
              backgroundImage: `${track}, ${CHECKER_IMAGE}`,
              backgroundSize: `auto, ${CHECKER_SIZE}`,
            }
          : { backgroundImage: track }
      }
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full border border-line-control"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 size-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface shadow-e2 ring-1 ring-fg"
        style={{
          left: `calc(${INSET}px + (100% - ${INSET * 2}px) * ${t})`,
          ...colourPaint(thumb),
        }}
      />
    </div>
  );
}
ColorRail.displayName = 'ColorRail';
