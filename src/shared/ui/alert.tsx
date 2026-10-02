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
}
export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, status = 'info', icon, children, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'flex gap-3 rounded-lg border p-4',
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
