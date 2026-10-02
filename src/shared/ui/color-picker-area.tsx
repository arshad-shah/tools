import React, { useRef } from 'react';
import { cn } from '@/shared/lib/cn';
import {
  areaBackground,
  areaLayout,
  axisText,
  nudge,
  pct,
  type PickerMode,
  type PickerState,
} from './color-picker-model';
import { colourPaint } from './swatch-paint';

export interface ColorAreaProps {
  state: PickerState;
  mode: PickerMode;
  /** Any CSS colour filling the thumb (the current colour). */
  thumb?: string;
  onChange(next: PickerState): void;
  /**
   * The value is settled (pointer released, or a key handled). A key calls
   * only this when given, so a keystroke reports once.
   */
  onCommit?(next: PickerState): void;
  className?: string;
}

const STEP = 0.01;
const BIG = 0.1;

/**
 * The 2D field of the ColorPicker: a slider pair (x and y, each
 * role=slider with aria-valuetext). Both sliders take all four arrows
 * (Left and Right move x, Up and Down move y; Shift moves 10 steps), and a
 * pointer drag sets both. The kit paints it with CSS gradients; it fills
 * the width at 4:3 (at least 200px tall) with a ring thumb in the colour.
 */
export function ColorArea({
  state,
  mode,
  thumb,
  onChange,
  onCommit,
  className,
}: ColorAreaProps) {
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const fromPointer = (e: React.PointerEvent) => {
    const r = box.current?.getBoundingClientRect();
    if (!r || r.width === 0 || r.height === 0) return state;
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height));
    return { ...state, x, y };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const next = fromPointer(e);
    onChange(next);
    // Focus the x slider so keyboard fine-tuning follows the pointer.
    box.current?.querySelector<HTMLElement>('[data-axis="x"]')?.focus();
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging.current) onChange(fromPointer(e));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    onCommit?.(fromPointer(e));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    const d = e.shiftKey ? BIG : STEP;
    const axis = (e.currentTarget.dataset.axis ?? 'x') as 'x' | 'y';
    let next: PickerState | null = null;
    if (e.key === 'ArrowRight') next = nudge(state, 'x', d);
    else if (e.key === 'ArrowLeft') next = nudge(state, 'x', -d);
    else if (e.key === 'ArrowUp') next = nudge(state, 'y', d);
    else if (e.key === 'ArrowDown') next = nudge(state, 'y', -d);
    else if (e.key === 'PageUp') next = nudge(state, axis, BIG);
    else if (e.key === 'PageDown') next = nudge(state, axis, -BIG);
    else if (e.key === 'Home') next = { ...state, [axis]: 0 };
    else if (e.key === 'End') next = { ...state, [axis]: 1 };
    if (!next) return;
    e.preventDefault();
    (onCommit ?? onChange)(next);
  };

  const labels =
    mode === 'srgb'
      ? { x: 'Saturation', y: 'Brightness' }
      : { x: 'Chroma', y: 'Lightness' };
  const sliderProps = (axis: 'x' | 'y') =>
    ({
      role: 'slider',
      tabIndex: 0,
      'data-axis': axis,
      'aria-label': labels[axis],
      'aria-orientation': axis === 'x' ? 'horizontal' : 'vertical',
      'aria-valuemin': 0,
      'aria-valuemax': 100,
      'aria-valuenow': pct(state[axis]),
      'aria-valuetext': axisText(axis, state, mode),
      onKeyDown,
    }) as const;

  return (
    <div
      ref={box}
      role="group"
      aria-label={`${labels.x} and ${labels.y}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragging.current = false;
      }}
      className={cn(
        'group relative aspect-[4/3] min-h-[200px] w-full cursor-crosshair touch-none rounded-md border border-line-control',
        'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus',
        className,
      )}
      style={{
        backgroundImage: areaBackground(state.h, mode),
        ...areaLayout(mode),
      }}
    >
      <span
        {...sliderProps('x')}
        className="absolute size-5 -translate-x-1/2 translate-y-1/2 rounded-full border-[3px] border-surface shadow-e2 outline-none ring-1 ring-fg group-focus-within:ring-2"
        style={{
          left: `${state.x * 100}%`,
          bottom: `${state.y * 100}%`,
          ...(thumb ? colourPaint(thumb) : null),
        }}
      />
      <span
        {...sliderProps('y')}
        className="absolute inset-y-0 right-0 w-0 overflow-hidden outline-none"
      />
    </div>
  );
}
ColorArea.displayName = 'ColorArea';
