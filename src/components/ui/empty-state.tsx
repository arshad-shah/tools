import React from 'react';
import { cn } from '@/lib/utils';

export const EmptyState: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line px-6 py-12 text-center',
      className,
    )}
    {...props}
  />
);
EmptyState.displayName = 'EmptyState';

export const EmptyStateIcon: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={cn(
      'flex size-12 items-center justify-center rounded-lg border border-line bg-surface text-accent',
      className,
    )}
    aria-hidden
    {...props}
  />
);
EmptyStateIcon.displayName = 'EmptyStateIcon';

export const EmptyStateTitle: React.FC<
  React.HTMLAttributes<HTMLHeadingElement>
> = ({ className, ...props }) => (
  <h3 className={cn('text-lg font-semibold text-fg', className)} {...props} />
);
EmptyStateTitle.displayName = 'EmptyStateTitle';

export const EmptyStateDescription: React.FC<
  React.HTMLAttributes<HTMLParagraphElement>
> = ({ className, ...props }) => (
  <p className={cn('max-w-md text-sm text-fg-muted', className)} {...props} />
);
EmptyStateDescription.displayName = 'EmptyStateDescription';

export const EmptyStateActions: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ className, ...props }) => (
  <div
    className={cn('mt-2 flex flex-wrap justify-center gap-3', className)}
    {...props}
  />
);
EmptyStateActions.displayName = 'EmptyStateActions';
