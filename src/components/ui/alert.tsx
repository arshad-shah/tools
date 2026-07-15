import React from 'react';
import { cn } from '@/lib/utils';

const statusStyles = {
  danger: 'border-danger/40 bg-danger-dim/60 text-danger',
  warning: 'border-warning/40 bg-warning/10 text-warning',
  success: 'border-success/40 bg-success/10 text-success',
  info: 'border-accent/40 bg-accent/10 text-accent',
} as const;

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: keyof typeof statusStyles;
  icon?: React.ReactNode;
}
export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, status = 'info', icon, children, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'flex gap-3 rounded-md border p-4',
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

export const AlertDescription: React.FC<
  React.HTMLAttributes<HTMLParagraphElement>
> = ({ className, ...props }) => (
  <p className={cn('mt-1 text-sm text-fg-muted', className)} {...props} />
);
AlertDescription.displayName = 'AlertDescription';
