import { IconImage } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'image-optimizer',
  name: 'Image Optimizer',
  description: 'Compress and optimize images for web usage',
  icon: IconImage,
  category: 'media',
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
