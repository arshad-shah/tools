import { defineIcon } from '../icon';

/*
 * Redact mode icons (spec §4.7), 24px grid. Solid redaction bars are
 * overlapping strokes (spaced no wider than the thinnest stroke, 1.5) so the
 * icons inherit the stroke and never set their own fill.
 */

export const IconRedactArea = defineIcon(
  'IconRedactArea',
  <>
    <rect x="3" y="5" width="18" height="14" rx="2" strokeDasharray="3 2" />
    <path d="M8 11.25h8M8 12.75h8" />
  </>,
);
export const IconRedactSearch = defineIcon(
  'IconRedactSearch',
  <>
    <circle cx="10" cy="10" r="6" />
    <path d="M14.5 14.5 20 20" />
    <path d="M8 10h4" />
  </>,
);
export const IconRedactApply = defineIcon(
  'IconRedactApply',
  <>
    <path d="M4 7.25h10M4 8.75h10" />
    <path d="M4 15.25h6M4 16.75h6" />
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
    <path d="M8.75 10.75h.5v.5h-.5z" />
    <path d="M11.75 13.75h.5v.5h-.5z" />
    <path d="M14.75 16.75h.5v.5h-.5z" />
    <path d="M14.75 10.75h.5v.5h-.5z" />
    <path d="M8.75 16.75h.5v.5h-.5z" />
  </>,
);
