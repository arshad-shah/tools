import { IconDroplets } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-watermark',
  name: 'Watermark PDF',
  description: 'Add a text or image watermark to PDF pages',
  icon: IconDroplets,
  category: 'pdf',
  version: '1.0.0',
  isNew: true,
  enabled: true,
  load: () => import('./Tool'),
});
