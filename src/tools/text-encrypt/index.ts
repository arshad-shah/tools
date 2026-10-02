import { IconLock } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'text-encrypt',
  name: 'Text & File Encrypt',
  description:
    'Encrypt text or any file with a passphrase (AES-256-GCM, PBKDF2 or Argon2id), all in your browser',
  icon: IconLock,
  category: 'security',
  slug: 'encrypt',
  kind: 'tool',
  keywords: [
    'aes',
    'encrypt text',
    'decrypt',
    'password encrypt',
    'pgp alternative',
  ],
  accepts: [
    { kinds: ['any'], mimes: ['text/plain', 'application/vnd.tools.secret'] },
  ],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
