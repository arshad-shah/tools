import type { JSX, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/** xs..xl for UI; 2xl and 3xl for empty-state and hero illustrations. */
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
export const ICON_PX: Record<IconSize, number> = {
  xs: 12,
  sm: 14,
  md: 18,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
};

export interface IconProps {
  /** Default 'md' (18px). */
  size?: IconSize;
  /** Default 1.75. */
  strokeWidth?: 1.5 | 1.75 | 2;
  /** Absent: decorative (`aria-hidden`). Present: `role="img"` + `aria-label`. */
  label?: string;
  className?: string;
}

export type IconComponent = ((props: IconProps) => JSX.Element) & {
  displayName: string;
};

const a11y = (label?: string) =>
  label
    ? ({ role: 'img', 'aria-label': label } as const)
    : ({ 'aria-hidden': true, focusable: false } as const);

/** Wraps a lucide icon with the kit defaults (size, stroke, currentColor, label handling). */
export function fromLucide(name: string, Lucide: LucideIcon): IconComponent {
  const C = ({
    size = 'md',
    strokeWidth = 1.75,
    label,
    className,
  }: IconProps) => (
    <Lucide
      size={ICON_PX[size]}
      strokeWidth={strokeWidth}
      absoluteStrokeWidth={false}
      className={cn('shrink-0', className)}
      {...a11y(label)}
    />
  );
  C.displayName = name;
  return C as IconComponent;
}

/**
 * Custom icon drawn on lucide's 24px grid: stroke currentColor, round caps
 * and joins, no fill unless `fill` (then fill currentColor, no stroke).
 */
export function defineIcon(
  name: string,
  children: ReactNode,
  opts: { fill?: boolean } = {},
): IconComponent {
  const C = ({
    size = 'md',
    strokeWidth = 1.75,
    label,
    className,
  }: IconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={ICON_PX[size]}
      height={ICON_PX[size]}
      viewBox="0 0 24 24"
      fill={opts.fill ? 'currentColor' : 'none'}
      stroke={opts.fill ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('shrink-0', className)}
      {...a11y(label)}
    >
      {label ? <title>{label}</title> : null}
      {children}
    </svg>
  );
  C.displayName = name;
  return C as IconComponent;
}
