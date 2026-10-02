import { defineIcon } from '../icon';

/* Workspace layout and viewport icons (spec §4.7) on the 24px grid. */

export const IconLayoutStandard = defineIcon(
  'IconLayoutStandard',
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 9v11M17 9v11" />
  </>,
);
export const IconLayoutFocus = defineIcon(
  'IconLayoutFocus',
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <rect x="8" y="16" width="8" height="2" rx="1" />
    <path d="M5 8v4" />
  </>,
);
export const IconDock = defineIcon(
  'IconDock',
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <rect x="6" y="15" width="12" height="3" rx="1.5" />
  </>,
);
export const IconRailToggle = defineIcon(
  'IconRailToggle',
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16" />
    <path d="M5.5 8h1.5M5.5 11h1.5M5.5 14h1.5" />
  </>,
);
export const IconInspectorToggle = defineIcon(
  'IconInspectorToggle',
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M15 4v16" />
    <path d="M17 8h2M17 11h2" />
  </>,
);
export const IconZoomFitWidth = defineIcon(
  'IconZoomFitWidth',
  <>
    <rect x="6" y="3" width="12" height="18" rx="1.5" />
    <path d="M2 12h4M18 12h4M4 10l-2 2 2 2M20 10l2 2-2 2" />
  </>,
);
export const IconZoomFitPage = defineIcon(
  'IconZoomFitPage',
  <>
    <rect x="7" y="5" width="10" height="14" rx="1.5" />
    <path d="M3 8V4h4M17 4h4v4M21 16v4h-4M7 20H3v-4" />
  </>,
);
