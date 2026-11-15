import React from 'react';
import { Stat } from '@arshad-shah/cynosure';
import type { IconData } from '@arshad-shah/cynosure/icons';

interface StatProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** A quieter line under the value. */
  hint?: React.ReactNode;
  /** A Facet icon on a tile beside the label (decorative). */
  icon?: IconData;
  /** Layout only. */
  className?: string;
}

/** A single labelled metric tile: Cynosure `Stat`. */
export const Statistic = React.forwardRef<HTMLElement, StatProps>(
  ({ className, label, value, hint, icon }, ref) => (
    <Stat
      ref={ref}
      label={label}
      value={value}
      description={hint}
      icon={icon}
      className={className}
    />
  ),
);
Statistic.displayName = 'Statistic';
