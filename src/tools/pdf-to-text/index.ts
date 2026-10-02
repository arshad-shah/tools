import { IconFileText } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-to-text',
  name: 'PDF to Text',
  description: 'Extract the text layer of a PDF as plain text (no OCR)',
  icon: IconFileText,
  category: 'pdf',
  slug: 'to-text',
  kind: 'quick-task',
  keywords: ['extract', 'text', 'copy', 'plain'],
  accepts: [{ kinds: ['pdf'] }],
  version: '1.0.0',
  isNew: true,
  enabled: true,
  load: () => import('./Tool'),
});
