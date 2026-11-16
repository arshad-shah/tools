import React, { type CSSProperties, type JSX } from 'react';
import { Icon } from '@arshad-shah/cynosure';
import type { IconData } from '@arshad-shah/cynosure/icons';
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
  /**
   * Default Facet's own 1.75. Sets `--cy-icon-stroke` on this icon; brand
   * marks are filled and ignore it.
   */
  strokeWidth?: 1.5 | 1.75 | 2;
  /** Absent: decorative (`aria-hidden`). Present: `role="img"` + `aria-label`. */
  label?: string;
  className?: string;
}

/** A kit icon: a component drawing one Facet icon, with that icon's data. */
export type IconComponent = ((props: IconProps) => JSX.Element) & {
  displayName: string;
  /** The Facet icon (or brand mark) it draws, for Cynosure's `icon` slots. */
  data: IconData;
};

/**
 * A kit icon over Cynosure's `<Icon>`: kit sizes in pixels, `label` as the
 * accessible name, Facet's stroke and currentColor. Every kit icon is a Facet
 * icon or a Cynosure brand mark; tools draws none of its own.
 */
export function fromFacet(name: string, data: IconData): IconComponent {
  const C = ({ size = 'md', strokeWidth, label, className }: IconProps) => (
    <Icon
      icon={data}
      size={ICON_PX[size]}
      {...(label ? { label } : {})}
      className={cn('shrink-0', className)}
      {...(strokeWidth
        ? { style: { '--cy-icon-stroke': strokeWidth } as CSSProperties }
        : {})}
    />
  );
  C.displayName = name;
  C.data = data;
  return C as IconComponent;
}

/** A kit icon component, by its `data`. */
export const isIconComponent = (v: unknown): v is IconComponent =>
  typeof v === 'function' && 'data' in v && typeof v.data === 'object';

/**
 * The Facet icon of an icon given as a component (`IconSearch`) or as a plain
 * element of one (`<IconSearch size="sm" />`), for a Cynosure `icon` slot,
 * which sizes and colours it to its control. Undefined for anything else, and
 * for an element with a `className`, `label` or `strokeWidth` (the slot would
 * drop them), so the caller renders that node as it is.
 */
export function facetOf(icon: unknown): IconData | undefined {
  if (isIconComponent(icon)) return icon.data;
  if (!React.isValidElement<IconProps>(icon) || !isIconComponent(icon.type))
    return undefined;
  const { className, label, strokeWidth } = icon.props;
  if (className || label || strokeWidth) return undefined;
  return icon.type.data;
}
