import { IconImages } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'images-to-pdf',
  name: 'Images to PDF',
  description: 'Combine PNG, JPEG, WebP and GIF images into one PDF',
  icon: IconImages,
  category: 'pdf',
  version: '1.0.0',
  isNew: true,
  enabled: true,
  load: () => import('./Tool'),
});
