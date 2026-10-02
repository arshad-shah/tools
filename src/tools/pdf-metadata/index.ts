import { IconTags } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-metadata',
  name: 'PDF Metadata',
  description:
    "View, edit or remove a PDF's title, author and other document properties",
  icon: IconTags,
  category: 'pdf',
  slug: 'metadata',
  kind: 'tool',
  keywords: ['title', 'author', 'properties', 'info'],
  accepts: [{ kinds: ['pdf'] }],
  version: '1.0.0',
  isNew: true,
  enabled: true,
  load: () => import('./Tool'),
});
