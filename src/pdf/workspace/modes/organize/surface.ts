import type { RefObject } from 'react';
import type { ModeProps } from '../types';

/** How an Organize tool's options show (backlog P5-B). */
export interface OrganizeSurface {
  presentation: 'popover' | 'sheet';
  anchor: RefObject<HTMLButtonElement | null>;
}

/** By the tool that opened it; a bottom sheet on phones. */
export const presentationFor = (
  layout: ModeProps['layout'],
): OrganizeSurface['presentation'] =>
  layout === 'phone' ? 'sheet' : 'popover';
