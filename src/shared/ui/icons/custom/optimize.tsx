import { defineIcon } from '../icon';

/*
 * Protect and Optimize mode icons (spec §4.7) on the page outline with a
 * fold, 24px grid. Arrows are drawn strokes, never glyphs.
 */

const page = (
  <>
    <path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" />
    <path d="M13 3l5 5v3" />
  </>
);

/** Sanitise: a page with a brush sweeping it clean. */
export const IconSanitize = defineIcon(
  'IconSanitize',
  <>
    {page}
    <path d="M21 13l-5 5" />
    <path d="M16 18l-2.5-.5L12 20l2 1.5 2.5-1.5z" />
    <path d="M8 9h4M8 13h3" />
  </>,
);

/** Permissions: a page with a key. */
export const IconPermissions = defineIcon(
  'IconPermissions',
  <>
    {page}
    <circle cx="15.5" cy="16.5" r="2.5" />
    <path d="M17.3 14.7L21 11M19.5 12.5l1.5 1.5" />
    <path d="M8 9h4" />
  </>,
);

/** Linearize (fast web view): a page streaming down in lines. */
export const IconLinearize = defineIcon(
  'IconLinearize',
  <>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M8 11h8M8 14h8M8 17h4" />
    <path d="M15 16v3M13.5 17.5L15 19l1.5-1.5" />
  </>,
);

/** Repair: a page with a wrench. */
export const IconRepair = defineIcon(
  'IconRepair',
  <>
    {page}
    <path d="M20.5 13.5a2.5 2.5 0 0 1-3.3 3.3l-3 3a1 1 0 0 1-1.4-1.4l3-3a2.5 2.5 0 0 1 3.3-3.3l-1.6 1.6.4 1 1 .4z" />
    <path d="M8 9h4" />
  </>,
);

/** Size breakdown: a page with stacked bars of different lengths. */
export const IconSizeBreakdown = defineIcon(
  'IconSizeBreakdown',
  <>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <rect x="8" y="11" width="8" height="2" rx=".5" />
    <rect x="8" y="14.5" width="5" height="2" rx=".5" />
    <path d="M8 18.5h2" />
  </>,
);
