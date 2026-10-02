/**
 * Header icon buttons stay out of sight until the header cell is hovered or
 * holds focus, while their popover is open, and always on touch screens
 * (no hover). They keep their space, which the column's minimum width
 * includes, so revealing them never squeezes the label.
 */
export const REVEAL =
  'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100 [@media(hover:none)]:opacity-100';
