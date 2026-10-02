import React from 'react';

export interface IndentProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'style'
> {
  /** Nesting depth (0 = no indent). */
  level: number;
  /** CSS px per level. Default 16. */
  step?: number;
  /** Extra CSS px added at every level. Default 0. */
  base?: number;
}

/** A box padded on the left by tree depth (outlines, trees, nested lists). */
export const Indent = React.forwardRef<HTMLDivElement, IndentProps>(
  ({ level, step = 16, base = 0, ...rest }, ref) => (
    <div
      ref={ref}
      style={{ paddingLeft: base + Math.max(0, level) * step }}
      {...rest}
    />
  ),
);
Indent.displayName = 'Indent';
