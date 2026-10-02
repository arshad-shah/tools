import { IconImages } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'images-to-pdf',
  name: 'Images to PDF',
  description: 'Combine PNG, JPEG, WebP and GIF images into one PDF',
  icon: IconImages,
  category: 'pdf',
  slug: 'images-to-pdf',
  kind: 'quick-task',
  keywords: ['convert', 'photos', 'jpg', 'png', 'combine'],
  accepts: [{ kinds: ['png', 'jpeg', 'webp', 'gif'], multiple: true }],
  version: '1.0.0',
  isNew: true,
  enabled: true,
  load: () => import('./Tool'),
});
