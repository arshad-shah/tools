import React from 'react';
import { cn } from '@/shared/lib/cn';
import { StatusDot } from './status-dot';

export const List: React.FC<React.HTMLAttributes<HTMLUListElement>> = ({
  className,
  ...props
}) => (
  <ul
    className={cn('flex flex-col gap-1.5 text-sm text-fg-muted', className)}
    {...props}
  />
);
List.displayName = 'List';

export const ListItem: React.FC<React.LiHTMLAttributes<HTMLLIElement>> = ({
  className,
  children,
  ...props
}) => (
  <li className={cn('flex items-center gap-2', className)} {...props}>
    <StatusDot tone="accent" decorative />
    <span className="min-w-0">{children}</span>
  </li>
);
ListItem.displayName = 'ListItem';
