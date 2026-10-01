import { Lock } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'hash-generator',
  name: 'Hash Generator',
  description: 'Generate MD5, SHA-256, and other hash algorithms',
  icon: Lock,
  category: 'security',
  version: '1.0.0',
  enabled: true,
  load: () => import('./HashGenerator'),
});
