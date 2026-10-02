import { defineIcon } from '../icon';

/* OCR mode icons (spec §4.7, §11), 24px grid. */

/** Run OCR: a scan frame over lines of text. */
export const IconOcrScan = defineIcon(
  'IconOcrScan',
  <>
    <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
    <path d="M8 9h8M8 12h8M8 15h5" />
  </>,
);
/** OCR language: a letter beside a globe meridian. */
export const IconOcrLanguage = defineIcon(
  'IconOcrLanguage',
  <>
    <path d="m3 18 4-11 4 11M4.5 14h5" />
    <circle cx="17" cy="14" r="4" />
    <path d="M13 14h8M17 10c1.2 1.1 1.2 6.9 0 8M17 10c-1.2 1.1-1.2 6.9 0 8" />
  </>,
);
/** Text layer: a page with a dashed (invisible) text line over an image. */
export const IconTextLayer = defineIcon(
  'IconTextLayer',
  <>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="m8 17 2.5-3 2 2 1.5-1.5L16 17z" />
    <path d="M8 10h8" strokeDasharray="2 1.5" />
  </>,
);
