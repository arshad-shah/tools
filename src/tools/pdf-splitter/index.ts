import { Scissors } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-splitter',
  name: 'PDF Splitter',
  description: 'Split PDF files into multiple documents by pages or ranges',
  icon: Scissors,
  category: 'pdf',
  version: '2.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
