import { IconLayoutGrid } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-organize',
  name: 'Organize PDF Pages',
  description: 'Reorder, rotate and delete pages visually',
  icon: IconLayoutGrid,
  category: 'pdf',
  slug: 'organize',
  kind: 'tool',
  keywords: ['reorder', 'rotate', 'delete', 'pages'],
  accepts: [{ kinds: ['pdf'] }],
  version: '1.0.0',
  isNew: true,
  enabled: true,
  load: () => import('./Tool'),
});
