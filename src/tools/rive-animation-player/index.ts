import { playCircle as icon } from '@arshad-shah/cynosure/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'rive-animation-player',
  name: 'Rive Animation Player',
  description:
    'Preview and control Rive animations with state machines and artboards',
  icon,
  category: 'media',
  slug: 'rive',
  kind: 'tool',
  keywords: ['rive', 'animation', 'player', 'state machine'],
  accepts: [{ kinds: ['riv'] }],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
