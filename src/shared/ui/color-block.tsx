import React from 'react';
import { ToolError } from '@/shared/lib/errors';

const HEX = /^#[0-9a-f]{6}$/i;

function checkHex(value: string, prop: string): void {
  if (!HEX.test(value))
    throw new ToolError(
      'INVALID_INPUT',
      `ColorBlock ${prop} must be #rrggbb, got "${value}".`,
    );
}

/** `#rrggbb` + alpha as a CSS colour (`rgba(...)` when translucent). */
function hexWithAlpha(hex: string, alpha = 1): string {
  if (alpha >= 1) return hex.toLowerCase();
  const n = parseInt(hex.slice(1), 16);
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export interface ColorBlockProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'style' | 'color'
> {
  /** Validated `#rrggbb` background. */
  color: string;
  /** 0-1 opacity of the background colour. */
  alpha?: number;
  /**
   * Validated `#rrggbb` text colour, inherited by children (kit text that
   * sets its own tone needs `text-inherit` to pick it up).
   */
  textColor?: string;
}

/**
 * A box painted in a user-chosen colour, with optional text on it
 * (colour previews, contrast samples). Size and shape come from className.
 */
export const ColorBlock = React.forwardRef<HTMLDivElement, ColorBlockProps>(
  ({ color, alpha, textColor, className, ...rest }, ref) => {
    checkHex(color, 'color');
    if (textColor !== undefined) checkHex(textColor, 'textColor');
    return (
      <div
        ref={ref}
        className={className}
        style={{
          backgroundColor: hexWithAlpha(color, alpha),
          color: textColor,
        }}
        {...rest}
      />
    );
  },
);
ColorBlock.displayName = 'ColorBlock';
