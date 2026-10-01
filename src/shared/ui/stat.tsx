import React from 'react';
import { cn } from '@/lib/utils';

interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
}

/** A single labelled metric tile. */
export const Statistic = React.forwardRef<HTMLDivElement, StatProps>(
  ({ className, label, value, hint, icon, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col gap-1 rounded-lg border border-line bg-surface p-4',
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2 font-mono text-xs text-fg-subtle">
        {icon && <span className="text-accent">{icon}</span>}
        {label}
      </div>
      <div className="font-mono text-2xl font-bold text-fg">{value}</div>
      {hint && <div className="text-xs text-fg-muted">{hint}</div>}
    </div>
  ),
);
Statistic.displayName = 'Statistic';
