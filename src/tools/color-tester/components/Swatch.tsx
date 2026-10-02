import React from 'react';
import { cn } from '@/shared/lib/cn';
import { ColorBlock } from '@/shared/ui';

/** Large decorative colour chip (`#rrggbb`, optional alpha). */
export const Swatch: React.FC<{
  color: string;
  alpha?: number;
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
}> = ({ color, alpha, size = 'md', rounded = true }) => (
  <ColorBlock
    aria-hidden
    color={color}
    alpha={alpha}
    className={cn(
      'shrink-0 border border-black/10',
      size === 'sm' ? 'size-8' : size === 'lg' ? 'size-16' : 'size-12',
      rounded ? 'rounded-full' : 'rounded-lg',
    )}
  />
);
