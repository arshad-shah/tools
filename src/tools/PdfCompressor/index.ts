import { Minimize2 } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-compressor',
  name: 'PDF Compressor',
  description: 'Reduce PDF file size with customizable compression levels',
  icon: Minimize2,
  category: 'pdf',
  version: '1.0.0',
  enabled: false,
  load: () => import('./PdfCompressor'),
});
