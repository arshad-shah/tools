import { Signature } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-sign',
  name: 'Sign PDF',
  description: 'Draw, upload or type a signature and place it on a page',
  icon: Signature,
  category: 'pdf',
  version: '1.0.0',
  isNew: true,
  enabled: true,
  load: () => import('./Tool'),
});
