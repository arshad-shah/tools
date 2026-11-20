import { fileText as icon } from '@arshad-shah/cynosure/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-to-text',
  name: 'PDF to Text',
  description: 'Extract the text layer of a PDF as plain text (no OCR)',
  icon,
  category: 'pdf',
  slug: 'to-text',
  kind: 'quick-task',
  keywords: ['extract', 'text', 'copy', 'plain'],
  accepts: [{ kinds: ['pdf'] }],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
