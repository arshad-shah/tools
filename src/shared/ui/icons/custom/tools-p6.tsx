import * as L from 'lucide-react';
import { fromLucide } from '../icon';

/* Phase-6 kit icons (Part 6-A2): lucide where it has a fitting glyph. The
   layout-direction icons live in ./diagram (IconLayoutLeftRight,
   IconLayoutTopBottom) and are reused, not redefined. */

/** "Send to" another tool (SendToMenu). */
export const IconSendTo = fromLucide('IconSendTo', L.Forward);
/** Copy a share link (ShareButton). */
export const IconShareLink = fromLucide('IconShareLink', L.Share2);
/** One bit of a BitGrid. */
export const IconBitToggle = fromLucide('IconBitToggle', L.ToggleLeft);

/* SplitPane collapse and expand, per pane edge. */
export const IconPanelLeftClose = fromLucide(
  'IconPanelLeftClose',
  L.PanelLeftClose,
);
export const IconPanelLeftOpen = fromLucide(
  'IconPanelLeftOpen',
  L.PanelLeftOpen,
);
export const IconPanelRightClose = fromLucide(
  'IconPanelRightClose',
  L.PanelRightClose,
);
export const IconPanelRightOpen = fromLucide(
  'IconPanelRightOpen',
  L.PanelRightOpen,
);
export const IconPanelTopClose = fromLucide(
  'IconPanelTopClose',
  L.PanelTopClose,
);
export const IconPanelTopOpen = fromLucide('IconPanelTopOpen', L.PanelTopOpen);
export const IconPanelBottomClose = fromLucide(
  'IconPanelBottomClose',
  L.PanelBottomClose,
);
export const IconPanelBottomOpen = fromLucide(
  'IconPanelBottomOpen',
  L.PanelBottomOpen,
);
/** Eyedropper: pick a colour from the screen. */
export const IconPipette = fromLucide('IconPipette', L.Pipette);
