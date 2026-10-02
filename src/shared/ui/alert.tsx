import React from 'react';
import { cn } from '@/shared/lib/cn';

const statusStyles = {
  danger: 'border-danger/40 bg-danger-soft text-danger',
  warning: 'border-warning/40 bg-warning-soft text-warning',
  success: 'border-accent-fg/40 bg-accent-soft text-accent-fg',
  info: 'border-info/40 bg-info-soft text-info',
} as const;

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: keyof typeof statusStyles;
  icon?: React.ReactNode;
  /** sm: compact padding and small text (inline notes). Default md. */
  size?: 'sm' | 'md';
}
export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    { className, status = 'info', icon, size = 'md', children, ...props },
    ref,
  ) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'flex rounded-lg border',
        size === 'sm' ? 'gap-2 p-3 text-sm' : 'gap-3 p-4',
        statusStyles[status],
        className,
      )}
      {...props}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  ),
);
Alert.displayName = 'Alert';

export const AlertTitle: React.FC<
  React.HTMLAttributes<HTMLParagraphElement>
> = ({ className, ...props }) => (
  <p className={cn('font-semibold text-fg', className)} {...props} />
);
AlertTitle.displayName = 'AlertTitle';

/** A div, so lists and stacks inside it are valid; paragraphs are spaced. */
export const AlertDescription: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ className, ...props }) => (
  <div
    className={cn('mt-1 text-sm text-fg-muted [&>p+p]:mt-2', className)}
    {...props}
  />
);
AlertDescription.displayName = 'AlertDescription';
