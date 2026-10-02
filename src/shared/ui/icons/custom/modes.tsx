import { defineIcon } from '../icon';

/*
 * Workspace mode icons (spec §4.7): one family on a document outline with a
 * fold, each with its mark in the lower half, on the 24px grid.
 */

const doc = (
  <>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </>
);

export const IconModeOrganize = defineIcon(
  'IconModeOrganize',
  <>
    {doc}
    <rect x="8" y="11" width="3" height="3" rx=".5" />
    <rect x="13" y="11" width="3" height="3" rx=".5" />
    <rect x="8" y="16" width="3" height="2" rx=".5" />
    <rect x="13" y="16" width="3" height="2" rx=".5" />
  </>,
);
export const IconModeEdit = defineIcon(
  'IconModeEdit',
  <>
    {doc}
    <path d="M9 18l.6-2.4 4.6-4.6 1.8 1.8-4.6 4.6z" />
  </>,
);
export const IconModeAnnotate = defineIcon(
  'IconModeAnnotate',
  <>
    {doc}
    <path d="M8 13h8M8 16.5h5" />
    <path d="M8 13h8" strokeWidth={3} strokeOpacity={0.35} />
  </>,
);
export const IconModeFillSign = defineIcon(
  'IconModeFillSign',
  <>
    {doc}
    <rect x="8" y="11" width="8" height="3" rx=".5" />
    <path d="M8 17.5c1-1 1.8-1 2.4 0s1.4 1 2.4 0 1.6-.8 3.2 0" />
  </>,
);
export const IconModeRedact = defineIcon(
  'IconModeRedact',
  <>
    {doc}
    <rect x="8" y="12" width="8" height="2.5" rx=".5" fill="currentColor" />
    <path d="M8 17h5" />
  </>,
);
export const IconModeConvert = defineIcon(
  'IconModeConvert',
  <>
    {doc}
    <path d="M8.5 13.5h6l-1.5-1.5M15.5 16.5h-6l1.5 1.5" />
  </>,
);
export const IconModeProtect = defineIcon(
  'IconModeProtect',
  <>
    {doc}
    <rect x="9" y="14" width="6" height="4.5" rx="1" />
    <path d="M10.5 14v-1.5a1.5 1.5 0 0 1 3 0V14" />
  </>,
);
export const IconModeOptimize = defineIcon(
  'IconModeOptimize',
  <>
    {doc}
    <path d="M12 11.5v6M9.5 15l2.5 2.5 2.5-2.5" />
  </>,
);
export const IconModeOcr = defineIcon(
  'IconModeOcr',
  <>
    {doc}
    <path d="M8 12v-1h1.5M16 12v-1h-1.5M8 17v1h1.5M16 17v1h-1.5M10 14.5h4" />
  </>,
);
