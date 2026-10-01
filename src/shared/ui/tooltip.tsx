import React from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'bottom';
  className?: string;
}

/**
 * Lightweight hover/focus tooltip. Shows on pointer hover and keyboard focus
 * (the trigger must be focusable). CSS-driven — no portal, no timers.
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  className,
}) => (
  <span className="group/tooltip relative inline-flex">
    {children}
    <span
      role="tooltip"
      className={cn(
        'pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md border border-line-strong bg-surface-subtle px-2 py-1 font-mono text-xs text-fg opacity-0 shadow-lg transition-opacity',
        'group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100',
        side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
        className,
      )}
    >
      {content}
    </span>
  </span>
);
Tooltip.displayName = 'Tooltip';
