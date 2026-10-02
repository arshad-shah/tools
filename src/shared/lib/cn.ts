import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/** The 44px touch-target utilities from tokens.css (size-touch, h-touch, ...). */
const TOUCH = ['touch'];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      size: [{ size: TOUCH }],
      h: [{ h: TOUCH }],
      w: [{ w: TOUCH }],
      'min-w': [{ 'min-w': TOUCH }],
      'min-h': [{ 'min-h': TOUCH }],
    },
  },
});

/** Merge conditional class names, resolving Tailwind conflicts last-wins. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
