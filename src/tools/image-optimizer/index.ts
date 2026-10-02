import { IconImage } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'image-optimizer',
  name: 'Image Optimizer',
  description: 'Compress and optimize images for web usage',
  icon: IconImage,
  category: 'media',
  slug: 'image-optimizer',
  kind: 'tool',
  keywords: ['compress', 'resize', 'image', 'webp'],
  accepts: [{ kinds: ['png', 'jpeg', 'webp', 'gif'], multiple: true }],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
