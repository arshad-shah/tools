import { Palette } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'color-tester',
  name: 'Color Tester',
  description: 'Test and preview color combinations',
  icon: Palette,
  category: 'media',
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
