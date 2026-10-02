import * as L from 'lucide-react';
import { defineIcon, fromLucide } from '../icon';

/* Diagram canvas controls (spec §6.7): lucide where it has the glyph, custom
   layout-direction icons on the 24px grid. */

export const IconZoomIn = fromLucide('IconZoomIn', L.ZoomIn);
export const IconZoomOut = fromLucide('IconZoomOut', L.ZoomOut);
export const IconMaximize = fromLucide('IconMaximize', L.Maximize);
export const IconMap = fromLucide('IconMap', L.Map);
export const IconLocate = fromLucide('IconLocate', L.LocateFixed);

/** Actual size: a frame holding 1:1 (the lucide scan corners read as "fit"). */
export const IconActualSize = defineIcon(
  'IconActualSize',
  <>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M7 10.5 8.5 9v6M15.5 10.5 17 9v6M12 10.5v.01M12 13.5v.01" />
  </>,
);

/** Parent card on the left, two children to its right. */
export const IconLayoutLeftRight = defineIcon(
  'IconLayoutLeftRight',
  <>
    <rect x="2" y="9" width="7" height="6" rx="1.5" />
    <rect x="15" y="3" width="7" height="6" rx="1.5" />
    <rect x="15" y="15" width="7" height="6" rx="1.5" />
    <path d="M9 12h3M12 6v12M12 6h3M12 18h3" />
  </>,
);

/** Parent card on top, two children below it. */
export const IconLayoutTopBottom = defineIcon(
  'IconLayoutTopBottom',
  <>
    <rect x="9" y="2" width="6" height="7" rx="1.5" />
    <rect x="3" y="15" width="6" height="7" rx="1.5" />
    <rect x="15" y="15" width="6" height="7" rx="1.5" />
    <path d="M12 9v3M6 12h12M6 12v3M18 12v3" />
  </>,
);
