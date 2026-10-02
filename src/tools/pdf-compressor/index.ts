import { IconMinimize2 } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-compressor',
  name: 'PDF Compressor',
  description:
    'Shrink PDFs by recompressing images and restructuring the file, with a per-stage report',
  icon: IconMinimize2,
  category: 'pdf',
  slug: 'compress',
  kind: 'quick-task',
  keywords: ['shrink', 'reduce', 'size', 'optimize'],
  accepts: [{ kinds: ['pdf'] }],
  version: '2.0.0',
  isNew: true,
  enabled: true,
  load: () => import('./Tool'),
});
