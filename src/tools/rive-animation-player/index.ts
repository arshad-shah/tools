import { IconPlay } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'rive-animation-player',
  name: 'Rive Animation Player',
  description:
    'Preview and control Rive animations with state machines and artboards',
  icon: IconPlay,
  category: 'media',
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
