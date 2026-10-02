import React from 'react';
import { cn } from '@/shared/lib/cn';

export const Swatch: React.FC<{
  color: string;
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
}> = ({ color, size = 'md', rounded = true }) => (
  <div
    aria-hidden
    className={cn(
      'shrink-0 border border-black/10',
      size === 'sm' ? 'size-8' : size === 'lg' ? 'size-16' : 'size-12',
      rounded ? 'rounded-full' : 'rounded-lg',
    )}
    // data-driven: user colour
    style={{ background: color }}
  />
);
