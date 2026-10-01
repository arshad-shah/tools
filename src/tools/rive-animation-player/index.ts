import { Play } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'rive-animation-player',
  name: 'Rive Animation Player',
  description:
    'Preview and control Rive animations with state machines and artboards',
  icon: Play,
  category: 'media',
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
