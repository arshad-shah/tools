import React from 'react';
import { cn } from '@/shared/lib/cn';
import { ToolError } from '@/shared/lib/errors';

const HEX = /^#[0-9a-f]{6}$/i;
const FAMILY = /^[\w -]+$/;

export interface FontSampleProps {
  /** A loaded font family name (letters, digits, spaces, hyphens). */
  family: string;
  /** Validated #rrggbb ink. */
  color: string;
  className?: string;
  'aria-label'?: string;
  children: React.ReactNode;
}

/**
 * Text shown in a chosen font and ink (typed signature previews). The kit
 * owns the inline style; inputs are validated, never passed through raw.
 */
export function FontSample({
  family,
  color,
  className,
  children,
  ...aria
}: FontSampleProps) {
  if (!HEX.test(color))
    throw new ToolError(
      'INVALID_INPUT',
      `Ink must be #rrggbb, got "${color}".`,
    );
  if (!FAMILY.test(family))
    throw new ToolError('INVALID_INPUT', `Invalid font family "${family}".`);
  return (
    <p
      className={cn(className)}
      style={{ fontFamily: `"${family}"`, color }}
      {...aria}
    >
      {children}
    </p>
  );
}
FontSample.displayName = 'FontSample';
