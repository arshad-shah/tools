import React from 'react';
import { cn } from '@/shared/lib/cn';

export interface ControlBarProps {
  /** Primary choices: the mode or direction (segmented controls, tabs). */
  start?: React.ReactNode;
  /** Secondary settings and actions, aligned to the end. */
  end?: React.ReactNode;
  /** Extra content below the row (a hint for the current choice). */
  footer?: React.ReactNode;
  /** raised: a card of its own (default). inset: inside a card. */
  tone?: 'raised' | 'inset';
  className?: string;
  'aria-label'?: string;
}

/**
 * One surface for a tool's controls: the mode on the left, its options on
 * the right, an optional hint underneath. Wraps to two rows on narrow
 * screens instead of scattering controls across the page.
 */
export function ControlBar({
  start,
  end,
  footer,
  tone = 'raised',
  className,
  'aria-label': ariaLabel,
}: ControlBarProps) {
  return (
    <div
      role={ariaLabel ? 'group' : undefined}
      aria-label={ariaLabel}
      className={cn(
        'flex flex-col gap-2 rounded-lg p-2',
        tone === 'inset' ? 'bg-surface-2' : 'bg-surface shadow-e1',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {start ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2 ps-1">
            {start}
          </div>
        ) : null}
        {end ? (
          <div className="ms-auto flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-2 pe-1">
            {end}
          </div>
        ) : null}
      </div>
      {footer ? <div className="px-1 pb-0.5">{footer}</div> : null}
    </div>
  );
}
ControlBar.displayName = 'ControlBar';
