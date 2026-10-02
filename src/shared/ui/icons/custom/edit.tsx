import { defineIcon } from '../icon';

/* Edit mode tools (spec §4.7) on the 24px page outline grid. */

const page = <rect x="5" y="3" width="14" height="18" rx="2" />;

export const IconCoverReplace = defineIcon(
  'IconCoverReplace',
  <>
    {page}
    <rect x="8" y="8" width="8" height="5" rx=".5" />
    <path d="M8 16.5h6" />
  </>,
);
export const IconHeaderFooter = defineIcon(
  'IconHeaderFooter',
  <>
    {page}
    <path d="M8 6.5h8M8 17.5h8" />
    <path d="M8 10.5h8M8 13.5h5" strokeOpacity={0.4} />
  </>,
);
export const IconPageNumbers = defineIcon(
  'IconPageNumbers',
  <>
    {page}
    <path d="M11 15.5l1.5-1.5v4" />
  </>,
);
export const IconWatermark = defineIcon(
  'IconWatermark',
  <>
    {page}
    <path d="M8 16l8-8" strokeOpacity={0.45} />
    <path d="M12 7.5c-1.6 2-2.5 3.4-2.5 4.6a2.5 2.5 0 0 0 5 0c0-1.2-.9-2.6-2.5-4.6z" />
  </>,
);
