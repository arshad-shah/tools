import { IconImage } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'image-optimizer',
  name: 'Image Compressor & Resizer',
  description:
    'Compress, resize and convert many images at once to WebP, AVIF, JPEG or PNG, with a target size and ZIP download',
  icon: IconImage,
  category: 'media',
  slug: 'image-optimizer',
  kind: 'tool',
  keywords: [
    'compress',
    'resize',
    'image',
    'webp',
    'avif',
    'image converter',
    'compress jpg',
    'resize image',
  ],
  accepts: [{ kinds: ['png', 'jpeg', 'webp', 'gif'], multiple: true }],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
