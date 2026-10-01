import { Minimize2 } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-compressor',
  name: 'PDF Compressor',
  description:
    'Shrink PDFs by recompressing images and restructuring the file, with a per-stage report',
  icon: Minimize2,
  category: 'pdf',
  version: '2.0.0',
  isNew: true,
  enabled: true,
  load: () => import('./Tool'),
});
