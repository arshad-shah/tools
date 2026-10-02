import { defineIcon } from '../icon';

/* Keyboard keys drawn for Kbd (spec §4.6, §13.1) on the 24px grid. */

export const KeyCommand = defineIcon(
  'KeyCommand',
  <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />,
);
export const KeyShift = defineIcon(
  'KeyShift',
  <path d="M9 18v-6H5l7-7 7 7h-4v6z" />,
);
export const KeyOption = defineIcon(
  'KeyOption',
  <path d="M3 6h5l7 12h6M15 6h6" />,
);
export const KeyControl = defineIcon('KeyControl', <path d="M6 13l6-6 6 6" />);
export const KeyEnter = defineIcon(
  'KeyEnter',
  <>
    <path d="M20 5v7a3 3 0 0 1-3 3H5" />
    <path d="M9 11l-4 4 4 4" />
  </>,
);
export const KeyBackspace = defineIcon(
  'KeyBackspace',
  <>
    <path d="M21 5H9l-6 7 6 7h12z" />
    <path d="M17 9l-6 6M11 9l6 6" />
  </>,
);
export const KeyTab = defineIcon(
  'KeyTab',
  <>
    <path d="M3 12h14" />
    <path d="M13 8l4 4-4 4" />
    <path d="M21 6v12" />
  </>,
);
export const KeyEscape = defineIcon(
  'KeyEscape',
  <>
    <path d="M9 4H4v5" />
    <path d="M4 4l7 7" />
    <path d="M14 5a7 7 0 1 1-9 9" />
  </>,
);
export const KeyArrowUp = defineIcon(
  'KeyArrowUp',
  <path d="M12 19V5M6 11l6-6 6 6" />,
);
export const KeyArrowDown = defineIcon(
  'KeyArrowDown',
  <path d="M12 5v14M6 13l6 6 6-6" />,
);
export const KeyArrowLeft = defineIcon(
  'KeyArrowLeft',
  <path d="M19 12H5M11 6l-6 6 6 6" />,
);
export const KeyArrowRight = defineIcon(
  'KeyArrowRight',
  <path d="M5 12h14M13 6l6 6-6 6" />,
);
