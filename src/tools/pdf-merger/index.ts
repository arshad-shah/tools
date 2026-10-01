import { FilePlus } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-merger',
  name: 'PDF Merger',
  description: 'Merge multiple PDF files into a single document',
  icon: FilePlus,
  category: 'pdf',
  version: '2.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
