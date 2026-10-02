import { IconFilePlus } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-merger',
  name: 'PDF Merger',
  description: 'Merge multiple PDF files into a single document',
  icon: IconFilePlus,
  category: 'pdf',
  version: '2.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
