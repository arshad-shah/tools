import { defineIcon } from '../icon';

/*
 * Organize mode icons (spec §4.7) on the page outline, 24px grid. Arrows are
 * drawn strokes, never glyphs.
 */

const page = <rect x="6" y="3" width="12" height="18" rx="2" />;

export const IconInsertBlankPage = defineIcon(
  'IconInsertBlankPage',
  <>
    {page}
    <path d="M12 9v6M9 12h6" />
  </>,
);
export const IconDuplicatePage = defineIcon(
  'IconDuplicatePage',
  <>
    <rect x="8" y="6" width="11" height="15" rx="2" />
    <path d="M5 16V5a2 2 0 0 1 2-2h8" />
  </>,
);
export const IconExtractPages = defineIcon(
  'IconExtractPages',
  <>
    <path d="M14 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2" />
    <path d="M10 12h11M18 9l3 3-3 3" />
  </>,
);
export const IconSplitAt = defineIcon(
  'IconSplitAt',
  <>
    <path d="M6 9V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4M6 15v4a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-4" />
    <path d="M3 12h18" strokeDasharray="2 2" />
  </>,
);
export const IconMergeIn = defineIcon(
  'IconMergeIn',
  <>
    <path d="M10 7V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-2" />
    <path d="M3 12h11M11 9l3 3-3 3" />
  </>,
);
export const IconCropPage = defineIcon(
  'IconCropPage',
  <>
    <path d="M6 2v14a2 2 0 0 0 2 2h14" />
    <path d="M18 22V8a2 2 0 0 0-2-2H2" />
  </>,
);
export const IconPageLabel = defineIcon(
  'IconPageLabel',
  <>
    {page}
    <path d="M9 14h6l1.5 1.5L15 17H9z" />
    <path d="M9 8h6" />
  </>,
);
export const IconRotatePageCw = defineIcon(
  'IconRotatePageCw',
  <>
    <rect x="4" y="9" width="10" height="12" rx="1.5" />
    <path d="M10 4.5a8 8 0 0 1 9 7.5" />
    <path d="M17 10l2 2 2-2" />
  </>,
);
export const IconRotatePageCcw = defineIcon(
  'IconRotatePageCcw',
  <>
    <rect x="10" y="9" width="10" height="12" rx="1.5" />
    <path d="M14 4.5a8 8 0 0 0-9 7.5" />
    <path d="M7 10l-2 2-2-2" />
  </>,
);
