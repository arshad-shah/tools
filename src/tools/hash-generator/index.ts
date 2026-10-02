import { IconLock } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'hash-generator',
  name: 'Hash Generator',
  description: 'Generate MD5, SHA-256, and other hash algorithms',
  icon: IconLock,
  category: 'security',
  slug: 'hash',
  kind: 'tool',
  keywords: ['hash', 'sha256', 'md5', 'checksum'],
  accepts: [{ kinds: ['any'] }],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
