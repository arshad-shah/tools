import React from 'react';
import { cn } from '@/shared/lib/cn';

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
  hidden?: boolean;
  className?: string;
}

/**
 * The canvas a Rive runtime draws on. The kit owns the element; the caller
 * binds its Rive instance through the forwarded ref (the player tool drives
 * Rive imperatively: artboards, inputs, layout).
 */
export const RivePlayer = React.forwardRef<HTMLCanvasElement, RivePlayerProps>(
  ({ label, background = 'transparent', hidden, className }, ref) => (
    <canvas
      ref={ref}
      role="img"
      aria-label={label}
      className={cn(
        hidden ? 'hidden' : 'block',
        BACKGROUND[background],
        className,
      )}
    />
  ),
);
RivePlayer.displayName = 'RivePlayer';
