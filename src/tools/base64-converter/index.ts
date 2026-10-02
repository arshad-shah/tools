import { IconFileCode } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'base64-converter',
  name: 'Base64 Encoder / Decoder',
  description:
    'Encode text and files to Base64 and decode Base64 or data URIs, with a look at what the data is',
  icon: IconFileCode,
  category: 'encoding',
  slug: 'base64',
  kind: 'tool',
  keywords: [
    'base64',
    'encode',
    'decode',
    'file',
    'base64 converter',
    'data uri',
  ],
  accepts: [{ kinds: ['any'] }],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
