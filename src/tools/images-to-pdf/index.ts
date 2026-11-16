import { images as icon } from '@arshad-shah/cynosure/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'images-to-pdf',
  name: 'Images to PDF',
  description: 'Combine PNG, JPEG, WebP and GIF images into one PDF',
  icon,
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
