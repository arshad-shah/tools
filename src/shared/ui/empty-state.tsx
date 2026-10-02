import React from 'react';
import { cn } from '@/shared/lib/cn';
import type { IconComponent } from './icons';

export interface EmptyStateProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'title'
> {
  icon?: IconComponent;
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Heading level of the title; default 3. */
  headingLevel?: 2 | 3 | 4;
  /** sm: a compact inline empty (lists, side panels). Default md. */
  size?: 'sm' | 'md';
}

/**
 * Empty state. Either the compound form (EmptyStateIcon, EmptyStateTitle,
 * ... as children) or the prop form (icon, title, description, actions).
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  className,
  icon: Icon,
  title,
  description,
  actions,
  headingLevel,
  size = 'md',
  children,
  ...props
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center text-center',
      size === 'sm'
        ? 'gap-1 rounded-md px-4 py-4'
        : 'gap-3 rounded-lg border border-dashed border-line-strong px-6 py-12',
      className,
    )}
    {...props}
  >
    {Icon ? (
      size === 'sm' ? (
        <Icon size="md" className="text-fg-subtle" />
      ) : (
        <EmptyStateIcon>
          <Icon size="lg" />
        </EmptyStateIcon>
      )
    ) : null}
    {title ? (
      <EmptyStateTitle
        level={headingLevel}
        className={size === 'sm' ? 'text-sm font-medium' : undefined}
      >
        {title}
      </EmptyStateTitle>
    ) : null}
    {description ? (
      <EmptyStateDescription className={size === 'sm' ? 'text-xs' : undefined}>
        {description}
      </EmptyStateDescription>
    ) : null}
    {actions ? <EmptyStateActions>{actions}</EmptyStateActions> : null}
    {children}
  </div>
);
EmptyState.displayName = 'EmptyState';

export const EmptyStateIcon: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={cn(
      'flex size-12 items-center justify-center rounded-lg bg-surface-2 text-accent-fg',
      className,
    )}
    aria-hidden
    {...props}
  />
);
EmptyStateIcon.displayName = 'EmptyStateIcon';

export const EmptyStateTitle: React.FC<
  React.HTMLAttributes<HTMLHeadingElement> & { level?: 2 | 3 | 4 }
> = ({ className, level = 3, ...props }) => {
  const Tag = `h${level}` as const;
  return (
    <Tag
      className={cn('text-lg font-semibold text-fg', className)}
      {...props}
    />
  );
};
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
