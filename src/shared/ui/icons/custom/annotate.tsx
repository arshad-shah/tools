import { defineIcon } from '../icon';

/*
 * Annotate mode tools (spec §4.7, §13.1) on the 24px grid. Arrows and
 * marks are drawn strokes, never glyphs.
 */

export const IconSelectTool = defineIcon(
  'IconSelectTool',
  <path d="M5 3l5.5 15 2.2-6.3L19 9.5z" />,
);
export const IconTextComment = defineIcon(
  'IconTextComment',
  <>
    <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-7l-4 4v-4H6a2 2 0 0 1-2-2z" />
    <path d="M9 7.5h6M12 7.5v6" />
  </>,
);
export const IconSquiggly = defineIcon(
  'IconSquiggly',
  <>
    <path d="M7 4v6a5 5 0 0 0 10 0V4" />
    <path d="M3 19l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2 2-2" />
  </>,
);
export const IconArrowAnnot = defineIcon(
  'IconArrowAnnot',
  <>
    <path d="M5 19L19 5" />
    <path d="M11 5h8v8" />
  </>,
);
export const IconLineAnnot = defineIcon(
  'IconLineAnnot',
  <path d="M5 19L19 5" />,
);
export const IconStampPreset = defineIcon(
  'IconStampPreset',
  <>
    <path d="M9.5 3h5l-1 7h-3z" />
    <path d="M5 13a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v2H5z" />
    <path d="M4 19h16" />
  </>,
);
export const IconReply = defineIcon(
  'IconReply',
  <>
    <path d="M9 7L4 12l5 5" />
    <path d="M4 12h10a6 6 0 0 1 6 6v1" />
  </>,
);
export const IconEllipseAnnot = defineIcon(
  'IconEllipseAnnot',
  <ellipse cx="12" cy="12" rx="9" ry="6.5" />,
);
