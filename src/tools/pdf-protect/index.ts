import { IconLock } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-protect',
  name: 'Protect PDF',
  description: 'Add a password and permission restrictions to a PDF (AES-256)',
  icon: IconLock,
  category: 'pdf',
  slug: 'protect',
  kind: 'quick-task',
  keywords: ['password', 'encrypt', 'lock', 'permissions'],
  accepts: [{ kinds: ['pdf'] }],
  alsoIn: ['security'],
  version: '1.0.0',
  isNew: true,
  enabled: true,
  load: () => import('./Tool'),
});
