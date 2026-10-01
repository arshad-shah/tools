import { ListOrdered } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-page-numbers',
  name: 'Add Page Numbers',
  description: 'Number the pages of a PDF in your chosen style and position',
  icon: ListOrdered,
  category: 'pdf',
  version: '1.0.0',
  isNew: true,
  enabled: true,
  load: () => import('./Tool'),
});
