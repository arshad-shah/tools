import { IconUnlock } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-unlock',
  name: 'Unlock PDF',
  description: 'Remove the password from a PDF you have the password for',
  icon: IconUnlock,
  category: 'pdf',
  slug: 'unlock',
  kind: 'quick-task',
  keywords: ['password', 'decrypt', 'remove', 'open'],
  accepts: [{ kinds: ['pdf'] }],
  alsoIn: ['security'],
  version: '1.0.0',
  isNew: true,
  enabled: true,
  load: () => import('./Tool'),
});
