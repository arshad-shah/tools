import { IconKey } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'password-generator',
  name: 'Password Generator',
  description: 'Generate secure passwords',
  icon: IconKey,
  category: 'security',
  slug: 'password',
  kind: 'tool',
  keywords: ['password', 'random', 'secure', 'passphrase'],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
