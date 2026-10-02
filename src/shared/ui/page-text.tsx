import React from 'react';
import { cn } from '@/shared/lib/cn';
import { ToolError } from '@/shared/lib/errors';
import { Positioned } from './positioned';
import {
  mapBox,
  type OverlayTransform,
  type PageSpaceBox,
} from './overlay-geometry';

const HEX = /^#[0-9a-f]{6}$/i;

export interface PageTextProps {
  transform: OverlayTransform;
  /** The text box in page space. */
  box: PageSpaceBox;
  /** One character per entry of `x`. */
  text: string;
  /** Font size in points. */
  size: number;
  /** '#rrggbb' (validated). */
  color: string;
  /** Left edge of each character from the box's left, in points. */
  x: number[];
  /** Baseline from the box's bottom, in points. */
  baseline: number;
  className?: string;
  'data-testid'?: string;
}

/**
 * Typed text drawn over a page exactly where the export puts it: each
 * character at its own page-space position (letter spacing and character
 * boxes come from the caller's layout), in a Helvetica-compatible face. The
 * kit owns the inline geometry; colours are validated, never passed raw.
 * Decorative: the field's own control carries the accessible name.
 */
export function PageText({
  transform,
  box,
  text,
  size,
  color,
  x,
  baseline,
  className,
  'data-testid': testId,
}: PageTextProps) {
  if (!HEX.test(color))
    throw new ToolError('INVALID_INPUT', 'PageText needs a #rrggbb colour.');
  const r = mapBox(transform, box);
  const scale = Math.hypot(transform.a, transform.b) || 1;
  const chars = Array.from(text).slice(0, x.length);
  return (
    <Positioned
      x={r.left}
      y={r.top}
      width={r.width}
      height={r.height}
      aria-hidden
      data-testid={testId}
      className={cn(
        'pointer-events-none overflow-visible whitespace-pre [font-family:Helvetica,Arial,sans-serif] leading-none',
        className,
      )}
    >
      {chars.map((ch, i) => (
        <span
          key={i}
          className="absolute"
          style={{
            left: x[i] * scale,
            bottom: baseline * scale,
            fontSize: size * scale,
            color,
          }}
        >
          {ch}
        </span>
      ))}
    </Positioned>
  );
}
PageText.displayName = 'PageText';

/** Advance of every glyph of Courier New (and metric clones), in em. */
export const MONO_ADVANCE = 0.6;

export interface PageTextInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value' | 'style' | 'size' | 'className'
> {
  value: string;
  onChange(value: string): void;
  /** The text's font size on screen, CSS px. */
  fontPx: number;
  /** Letter spacing on screen, CSS px. */
  spacingPx?: number;
  /**
   * Character boxes: each box's width on screen, CSS px. The (invisible)
   * text then runs in a monospace face spaced to one box per character, so
   * the caret and selection sit on the box edges.
   */
  cellPx?: number;
  'aria-label': string;
}

/**
 * The caret for typing straight onto a page: a transparent input that
 * fills its parent (the box being edited). The text itself is drawn by
 * PageText where the export puts it, so the page shows through and the
 * text appears in place at its true size; this input only carries the
 * caret, the selection and the keyboard. With `cellPx` its advances match
 * the character boxes.
 */
export const PageTextInput = React.forwardRef<
  HTMLInputElement,
  PageTextInputProps
>(({ value, onChange, fontPx, spacingPx = 0, cellPx, ...rest }, ref) => (
  <input
    ref={ref}
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    autoComplete="off"
    spellCheck={false}
    className={cn(
      'absolute inset-0 m-0 h-full w-full border-0 bg-transparent p-0 leading-none text-transparent caret-accent-fg outline-none selection:bg-accent-soft',
      cellPx
        ? "[font-family:'Courier_New',Courier,'Liberation_Mono',monospace]"
        : '[font-family:Helvetica,Arial,sans-serif]',
    )}
    style={{
      fontSize: fontPx,
      letterSpacing: cellPx ? cellPx - MONO_ADVANCE * fontPx : spacingPx,
    }}
    {...rest}
  />
));
PageTextInput.displayName = 'PageTextInput';
