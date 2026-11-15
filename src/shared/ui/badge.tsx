import type React from 'react';
import { Badge as CyBadge } from '@arshad-shah/cynosure';

export type BadgeVariant = 'solid' | 'soft' | 'outline';
export type BadgeTone =
  | 'accent'
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';
export type BadgeSize = 'xs' | 'sm' | 'md';

/** Kit size to Cynosure size (Cynosure's smallest badge is sm). */
const SIZE = { xs: 'sm', sm: 'sm', md: 'md' } as const;

export interface BadgeProps extends Omit<
  React.HTMLAttributes<HTMLSpanElement>,
  'color'
> {
  variant?: BadgeVariant | null;
  tone?: BadgeTone | null;
  size?: BadgeSize | null;
  /** Fully rounded ends. */
  pill?: boolean | null;
  /** Kept for call sites: Cynosure's badge is always mono. */
  mono?: boolean;
  /** Leading icon, rendered before the label with the built-in gap. */
  icon?: React.ReactNode;
}

/**
 * Cynosure's Badge. Kit icons are React nodes, so they ride beside the text
 * until the icon swap. Attributes Cynosure's Badge does not take (a test id,
 * aria-hidden) go on a box-less wrapper.
 */
export function Badge({
  className,
  variant,
  tone,
  size,
  pill,
  mono,
  icon,
  children,
  style,
  ...attrs
}: BadgeProps) {
  void mono;
  const badge = (
    <CyBadge
      tone={tone ?? 'neutral'}
      variant={variant ?? 'soft'}
      size={SIZE[size ?? 'md']}
      {...(className ? { className } : {})}
      style={
        pill
          ? ({
              '--cy-badge-radius': 'var(--cy-radius-full)',
              ...style,
            } as React.CSSProperties)
          : style
      }
    >
      {icon ? (
        <>
          {icon}
          {children}
        </>
      ) : (
        children
      )}
    </CyBadge>
  );
  if (Object.keys(attrs).length === 0) return badge;
  return (
    <span className="contents" {...attrs}>
      {badge}
    </span>
  );
}
Badge.displayName = 'Badge';
