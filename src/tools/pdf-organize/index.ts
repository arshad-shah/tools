import { LayoutGrid } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-organize',
  name: 'Organize PDF Pages',
  description: 'Reorder, rotate and delete pages visually',
  icon: LayoutGrid,
  category: 'pdf',
  version: '1.0.0',
  isNew: true,
  enabled: true,
  load: () => import('./Tool'),
});
