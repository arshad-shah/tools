import { Tags } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-metadata',
  name: 'PDF Metadata',
  description:
    "View, edit or remove a PDF's title, author and other document properties",
  icon: Tags,
  category: 'pdf',
  version: '1.0.0',
  isNew: true,
  enabled: true,
  load: () => import('./Tool'),
});
