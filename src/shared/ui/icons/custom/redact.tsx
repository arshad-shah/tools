import { defineIcon } from '../icon';

/* Redact mode icons (spec §4.7), 24px grid. */

export const IconRedactArea = defineIcon(
  'IconRedactArea',
  <>
    <rect x="3" y="5" width="18" height="14" rx="2" strokeDasharray="3 2" />
    <rect x="7" y="10" width="10" height="4" fill="currentColor" />
  </>,
);
export const IconRedactSearch = defineIcon(
  'IconRedactSearch',
  <>
    <circle cx="10" cy="10" r="6" />
    <path d="M14.5 14.5 20 20" />
    <rect x="7" y="9" width="6" height="2" fill="currentColor" />
  </>,
);
export const IconRedactApply = defineIcon(
  'IconRedactApply',
  <>
    <rect x="3" y="6" width="12" height="4" fill="currentColor" />
    <rect x="3" y="14" width="8" height="4" fill="currentColor" />
    <path d="m14 16 3 3 5-6" />
  </>,
);
export const IconRedactVerified = defineIcon(
  'IconRedactVerified',
  <>
    <path d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6z" />
    <path d="m9 12 2 2 4-4" />
  </>,
);
export const IconRasterised = defineIcon(
  'IconRasterised',
  <>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <rect x="8" y="10" width="2" height="2" fill="currentColor" />
    <rect x="11" y="13" width="2" height="2" fill="currentColor" />
    <rect x="14" y="16" width="2" height="2" fill="currentColor" />
    <rect x="14" y="10" width="2" height="2" fill="currentColor" />
    <rect x="8" y="16" width="2" height="2" fill="currentColor" />
  </>,
);
