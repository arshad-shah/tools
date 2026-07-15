import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Groups buttons into a single segmented control — collapses the borders/radii
 * between adjacent children.
 */
export const ButtonGroup: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    role="group"
    className={cn(
      'inline-flex items-center [&>*]:rounded-none',
      '[&>*:first-child]:rounded-l-md [&>*:last-child]:rounded-r-md',
      '[&>*:not(:first-child)]:-ml-px',
      className,
    )}
    {...props}
  />
);
ButtonGroup.displayName = 'ButtonGroup';
