import { key as icon } from '@arshad-shah/cynosure/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'password-generator',
  name: 'Password Generator',
  description:
    'Generate passwords, passphrases and PINs, and check the strength of a password',
  icon,
  category: 'security',
  slug: 'password',
  kind: 'tool',
  keywords: ['password', 'random', 'secure', 'passphrase'],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
