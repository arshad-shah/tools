import type { ToolSurface } from '../../ui/ToolDialog';
import type { ModeProps } from '../types';

/** How an Organize tool's options show (backlog P5-B). */
export type OrganizeSurface = ToolSurface;

/** By the tool that opened it; a bottom sheet on phones. */
export const presentationFor = (
  layout: ModeProps['layout'],
): ToolSurface['presentation'] => (layout === 'phone' ? 'sheet' : 'popover');
