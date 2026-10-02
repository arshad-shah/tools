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
  // A PDF from a hub drop; a password from the Password Generator.
  accepts: [{ kinds: ['pdf'] }, { mimes: ['application/vnd.tools.secret'] }],
  alsoIn: ['security'],
  version: '1.0.0',
  isNew: true,
  enabled: true,
  load: () => import('./Tool'),
});
