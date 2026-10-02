import { defineIcon } from '../icon';

/*
 * Signing+ icons (plan H-1) on lucide's 24px grid, stroke 1.75 by default.
 * Marks and letters are drawn paths, never glyphs.
 */

const squiggle = 'M4 15c1.5-3.5 3-4 3.5-2s1 3 2.5.5 2.5-3.5 3-1 1.5 2 3.5.5';
const seal = <circle cx="17" cy="16" r="4" />;

export const IconInkPen = defineIcon(
  'IconInkPen',
  <>
    <path d="M15.5 4.5l4 4L9 19l-5 1 1-5z" />
    <path d="M13 7l4 4" />
    <path d="M5 15l4 4" />
  </>,
);
export const IconInkWeight = defineIcon(
  'IconInkWeight',
  <>
    <path d="M4 6h16" strokeWidth="1" />
    <path d="M4 12h16" strokeWidth="2.25" />
    <path d="M4 18h16" strokeWidth="3.5" />
  </>,
);
export const IconTraceSignature = defineIcon(
  'IconTraceSignature',
  <>
    <path d="M3 7V4h3M18 4h3v3M21 17v3h-3M6 20H3v-3" />
    <path d={squiggle} />
  </>,
);
export const IconSignatureBlock = defineIcon(
  'IconSignatureBlock',
  <>
    <path d="M4 10c1.2-2.8 2.4-3.2 2.8-1.6s.8 2.4 2 .4 2-2.8 2.4-.8 1.2 1.6 2.8.4" />
    <path d="M4 13h16" />
    <path d="M4 17h10M4 20h6" />
  </>,
);
export const IconInitialPages = defineIcon(
  'IconInitialPages',
  <>
    <path d="M8 3h9a2 2 0 0 1 2 2v12" />
    <rect x="4" y="7" width="12" height="14" rx="2" />
    <path d="M7 17l1.5-5 1.5 5M12 12v5" />
  </>,
);
export const IconNextSignTarget = defineIcon(
  'IconNextSignTarget',
  <>
    <path d="M3 18h11" />
    <path d="M4 15c1-2.5 2-3 2.5-1.5s1 2 2-.5 1.5-2.5 2-.5" />
    <path d="M16 9h5M18.5 6.5L21 9l-2.5 2.5" />
  </>,
);
export const IconCertificate = defineIcon(
  'IconCertificate',
  <>
    <path d="M12 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5" />
    <path d="M7 8h10M7 12h5" />
    {seal}
    <path d="M15.5 19.5L15 22l2-1 2 1-.5-2.5" />
  </>,
);
export const IconCertificateNew = defineIcon(
  'IconCertificateNew',
  <>
    <path d="M12 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5" />
    <path d="M7 8h10M7 12h5" />
    <path d="M18 14v6M15 17h6" />
  </>,
);
export const IconTimestamp = defineIcon(
  'IconTimestamp',
  <>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2.5 2.5" />
    <path d="M10 2h4M12 2v3" />
  </>,
);
export const IconSignatureVerified = defineIcon(
  'IconSignatureVerified',
  <>
    <path d="M3 13c1.2-2.8 2.4-3.2 2.8-1.6s.8 2.4 2 .4 2-2.8 2.4-.8" />
    <path d="M3 19h8" />
    {seal}
    <path d="M15.3 16l1.2 1.2 2.2-2.4" />
  </>,
);
export const IconSignatureBroken = defineIcon(
  'IconSignatureBroken',
  <>
    <path d="M3 13c1.2-2.8 2.4-3.2 2.8-1.6s.8 2.4 2 .4 2-2.8 2.4-.8" />
    <path d="M3 19h8" />
    {seal}
    <path d="M15.6 14.6l2.8 2.8M18.4 14.6l-2.8 2.8" />
  </>,
);
export const IconSignatureUnknown = defineIcon(
  'IconSignatureUnknown',
  <>
    <path d="M3 13c1.2-2.8 2.4-3.2 2.8-1.6s.8 2.4 2 .4 2-2.8 2.4-.8" />
    <path d="M3 19h8" />
    {seal}
    <path d="M15.8 14.8a1.3 1.3 0 0 1 2.5.4c0 .9-1.3 1.1-1.3 1.8" />
    <path d="M17 18.4h.01" />
  </>,
);
export const IconSummaryPage = defineIcon(
  'IconSummaryPage',
  <>
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <path d="M14 3v6h6" />
    <path d="M8 13h8M8 17h5" />
  </>,
);
