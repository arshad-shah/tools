import { IconFileImage } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-to-images',
  name: 'PDF to Images',
  description: 'Convert PDF pages to PNG or JPEG images at up to 300 DPI',
  icon: IconFileImage,
  category: 'pdf',
  slug: 'to-images',
  kind: 'quick-task',
  keywords: ['convert', 'png', 'jpeg', 'export', 'pages'],
  accepts: [{ kinds: ['pdf'] }],
  version: '1.0.0',
  isNew: true,
  enabled: true,
  load: () => import('./Tool'),
});
