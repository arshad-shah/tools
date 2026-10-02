import { IconFileCode } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'base64-converter',
  name: 'Base64 Converter',
  description: 'Convert text and files to and from Base64 encoding',
  icon: IconFileCode,
  category: 'encoding',
  slug: 'base64',
  kind: 'tool',
  keywords: ['base64', 'encode', 'decode', 'file'],
  accepts: [{ kinds: ['any'] }],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
