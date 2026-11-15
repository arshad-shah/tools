import type React from 'react';
import { Inline } from '@arshad-shah/cynosure';

/**
 * A row of related buttons, named as one group. Cynosure has no joined
 * button group, so the buttons sit side by side with a small gap.
 */
export function ButtonGroup({
  className,
  children,
  id,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Inline
      role="group"
      gap="2"
      wrap
      id={id}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={className}
    >
      {children}
    </Inline>
  );
}
ButtonGroup.displayName = 'ButtonGroup';
