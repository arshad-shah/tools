import { FileText } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-to-text',
  name: 'PDF to Text',
  description: 'Extract the text layer of a PDF as plain text (no OCR)',
  icon: FileText,
  category: 'pdf',
  version: '1.0.0',
  isNew: true,
  enabled: true,
  load: () => import('./Tool'),
});
