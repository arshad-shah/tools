import { IconLock } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'hash-generator',
  name: 'Hash & Checksum',
  description:
    'Hash text and files with SHA-2, SHA-3, BLAKE, legacy and checksum algorithms; verify a hash and compute HMACs',
  icon: IconLock,
  category: 'security',
  slug: 'hash',
  kind: 'tool',
  keywords: [
    'hash',
    'sha256',
    'md5',
    'checksum',
    'hash generator',
    'hmac',
    'crc32',
    'blake3',
  ],
  accepts: [{ kinds: ['any'], mimes: ['text/plain'] }],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
