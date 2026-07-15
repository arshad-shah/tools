import React from 'react';
import { cn } from '@/lib/utils';

const spinnerSize = {
  sm: 'size-4 border-2',
  md: 'size-6 border-2',
  lg: 'size-8 border-[3px]',
  xl: 'size-10 border-[3px]',
} as const;

interface SpinnerProps {
  size?: keyof typeof spinnerSize;
  className?: string;
  label?: string;
}
export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  className,
  label = 'Loading',
}) => (
  <span
    role="status"
    aria-label={label}
    className={cn(
      'inline-block animate-spin rounded-full border-line border-t-accent',
      spinnerSize[size],
      className,
    )}
  />
);
Spinner.displayName = 'Spinner';
