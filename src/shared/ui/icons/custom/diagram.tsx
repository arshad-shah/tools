import * as L from 'lucide-react';
import { defineIcon, fromLucide } from '../icon';

/* Diagram canvas controls (spec §6.7): lucide where it has the glyph, custom
   layout-direction icons on the 24px grid. */

export const IconZoomIn = fromLucide('IconZoomIn', L.ZoomIn);
export const IconZoomOut = fromLucide('IconZoomOut', L.ZoomOut);
export const IconMaximize = fromLucide('IconMaximize', L.Maximize);
export const IconScan = fromLucide('IconScan', L.Scan);
export const IconMap = fromLucide('IconMap', L.Map);
export const IconLocate = fromLucide('IconLocate', L.LocateFixed);

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
