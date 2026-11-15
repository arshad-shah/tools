import type React from 'react';
import { LoadingDots } from '@arshad-shah/cynosure';

const SIZE = { sm: 'sm', md: 'md', lg: 'lg', xl: 'lg' } as const;

interface SpinnerProps {
  size?: keyof typeof SIZE;
  className?: string;
  label?: string;
  /** Inside something that already announces (a status region, a busy button). */
  decorative?: boolean;
}

/**
 * Cynosure's turning loader (LoadingDots `spinner`); still under reduced
 * motion. Announces `label` as a status unless decorative.
 */
export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  className,
  label = 'Loading',
  decorative,
}) => (
  <LoadingDots
    variant="spinner"
    size={SIZE[size]}
    tone="accent"
    {...(decorative ? {} : { label })}
    {...(className ? { className } : {})}
  />
);
Spinner.displayName = 'Spinner';
