import { defineIcon } from '../icon';

/*
 * Fill & Sign icons (spec §4.7, plan C-2) on lucide's 24px grid, stroke
 * 1.75 by default. Letters and marks are drawn paths, never glyphs.
 */

const field = <rect x="3" y="7" width="18" height="10" rx="2" />;

export const IconFlatFormDetect = defineIcon(
  'IconFlatFormDetect',
  <>
    <path d="M13 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8l4 4v4" />
    <rect x="7" y="9" width="7" height="4" strokeDasharray="2 1.5" />
    <circle cx="17" cy="17" r="2.5" />
    <path d="M19 19l2 2" />
  </>,
);
export const IconMakeFillable = defineIcon(
  'IconMakeFillable',
  <>
    <path d="M11 7H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h6" strokeDasharray="2 2" />
    <path d="M11 7h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-8" />
    <path d="M16 10v4M14 12h4" />
  </>,
);
export const IconFieldText = defineIcon(
  'IconFieldText',
  <>
    {field}
    <path d="M9 10h6M12 10v5" />
  </>,
);
export const IconFieldTick = defineIcon(
  'IconFieldTick',
  <>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M8.5 12.5l2 2 4.5-4.5" />
  </>,
);
export const IconFieldCross = defineIcon(
  'IconFieldCross',
  <>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M9 9l6 6M15 9l-6 6" />
  </>,
);
export const IconFieldDate = defineIcon(
  'IconFieldDate',
  <>
    <rect x="3" y="5" width="18" height="15" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
    <path d="M7.5 14h1M11.5 14h1M15.5 14h1" />
  </>,
);
export const IconFieldSignature = defineIcon(
  'IconFieldSignature',
  <>
    {field}
    <path d="M6 14c1.5-3 2.5-3 3-1.5s1 2 2.5-.5 2-2 2.5 0 1.5 1 3.5-.5" />
  </>,
);
export const IconFieldSuggested = defineIcon(
  'IconFieldSuggested',
  <>
    <rect x="3" y="8" width="14" height="10" rx="2" strokeDasharray="2 2" />
    <path d="M19 3v4M17 5h4M20.5 9.5l-1-1" />
  </>,
);
export const IconSnapToCell = defineIcon(
  'IconSnapToCell',
  <>
    <path d="M3 9h12M3 15h12M9 3v12M15 3v6" />
    <path d="M14 15v3a3 3 0 0 0 6 0v-3M14 17h1.5M18.5 17H20" />
  </>,
);
export const IconNextField = defineIcon(
  'IconNextField',
  <>
    <rect x="2" y="7" width="13" height="10" rx="2" />
    <path d="M18 8l4 4-4 4" />
  </>,
);
export const IconMyDetails = defineIcon(
  'IconMyDetails',
  <>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <circle cx="8" cy="11" r="2" />
    <path d="M5 16a3 3 0 0 1 6 0M14 10h4M14 14h4" />
  </>,
);
export const IconFlatten = defineIcon(
  'IconFlatten',
  <>
    <path d="M12 3l9 4.5-9 4.5-9-4.5z" />
    <path d="M3 12l9 4.5 9-4.5M3 16.5l9 4.5 9-4.5" />
  </>,
);
export const IconSignatureDraw = defineIcon(
  'IconSignatureDraw',
  <>
    <path d="M14.5 4.5l3 3L9 16H6v-3z" />
    <path d="M3 20c2-1.5 3.5-1.5 4.5 0s2.5 1.5 4 0 3-1.5 4.5 0 3 1 5-.5" />
  </>,
);
export const IconSignatureType = defineIcon(
  'IconSignatureType',
  <>
    <path d="M3 19h18" />
    <path d="M10 5h7M13.5 5l-3 11M8 16h5" />
  </>,
);
export const IconSignatureUpload = defineIcon(
  'IconSignatureUpload',
  <>
    <path d="M13 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7" />
    <circle cx="9" cy="9" r="2" />
    <path d="M3 17l5-5 4 4" />
    <path d="M18 22v-7M15 18l3-3 3 3" />
  </>,
);
export const IconInitials = defineIcon(
  'IconInitials',
  <>
    <path d="M3 15c1-4 2.5-6 3.5-6s.5 4-1 6 3-3 4-2-1 2 0 2" />
    <path d="M13 15c1-4 2.5-6 3.5-6s.5 4-1 6 3-3 4-2-1 2 0 2" />
    <path d="M3 19h18" />
  </>,
);
