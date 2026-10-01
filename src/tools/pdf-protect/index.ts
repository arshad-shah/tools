import { Lock } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-protect',
  name: 'Protect PDF',
  description: 'Add a password and permission restrictions to a PDF (AES-256)',
  icon: Lock,
  category: 'pdf',
  version: '1.0.0',
  isNew: true,
  enabled: true,
  load: () => import('./Tool'),
});
