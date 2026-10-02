import React from 'react';
import { cn } from '@/shared/lib/cn';
import { parseColor } from '@/shared/lib/colour';
import { CHECKER_IMAGE, colourPaint } from '../swatch-paint';

const BACKGROUND = {
  transparent: 'bg-transparent',
  white: 'bg-white',
  black: 'bg-black',
} as const;

export interface RivePlayerProps {
  /** Accessible name of the animation. */
  label: string;
  /** The stage behind the artboard (a user choice, not a theme colour). */
  background?: keyof typeof BACKGROUND;
  /**
   * Any CSS colour behind the artboard (a user choice); overrides
   * `background`. Invalid text falls back to `background`.
   */
  color?: string;
  /** A checkerboard behind the artboard, to judge transparency. */
  checkerboard?: boolean;
  hidden?: boolean;
  className?: string;
}

function stagePaint(
  color: string | undefined,
  checkerboard: boolean | undefined,
): React.CSSProperties | undefined {
  if (checkerboard)
    return { backgroundImage: CHECKER_IMAGE, backgroundSize: '16px 16px' };
  if (!color) return undefined;
  try {
    // Fully transparent shows the page; translucent shows over a checkerboard.
    return parseColor(color).alpha === 0 ? undefined : colourPaint(color);
  } catch {
    return undefined;
  }
}

/**
 * The canvas a Rive runtime draws on. The kit owns the element; the caller
 * binds its Rive instance through the forwarded ref (the player tool drives
 * Rive imperatively: artboards, inputs, layout).
 */
export const RivePlayer = React.forwardRef<HTMLCanvasElement, RivePlayerProps>(
  (
    {
      label,
      background = 'transparent',
      color,
      checkerboard,
      hidden,
      className,
    },
    ref,
  ) => (
    <canvas
      ref={ref}
      role="img"
      aria-label={label}
      className={cn(
        hidden ? 'hidden' : 'block',
        BACKGROUND[background],
        className,
      )}
      style={stagePaint(color, checkerboard)}
    />
  ),
);
RivePlayer.displayName = 'RivePlayer';
