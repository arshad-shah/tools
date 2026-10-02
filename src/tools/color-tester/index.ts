import { IconPalette } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'color-tester',
  name: 'Color Tester',
  description: 'Test and preview color combinations',
  icon: IconPalette,
  category: 'media',
  slug: 'color',
  kind: 'tool',
  keywords: ['colour', 'color', 'contrast', 'palette'],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
