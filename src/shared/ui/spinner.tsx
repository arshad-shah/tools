import React from 'react';
import { cn } from '@/shared/lib/cn';

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
  /** Inside something that already announces (a status region, a busy button). */
  decorative?: boolean;
}
export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  className,
  label = 'Loading',
  decorative,
}) => (
  <span
    {...(decorative
      ? { 'aria-hidden': true }
      : { role: 'status', 'aria-label': label })}
    className={cn(
      // Reduced motion: a still ring (no transform animation, spec §4.4).
      'inline-block motion-safe:animate-spin rounded-full border-line border-t-accent',
      spinnerSize[size],
      className,
    )}
  />
);
Spinner.displayName = 'Spinner';
