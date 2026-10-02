import { IconSplit } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'url-parser',
  name: 'URL Inspector & Builder',
  description:
    'Inspect, edit and rebuild URLs: parts, query params, IDN, domain and tracking cleanup',
  icon: IconSplit,
  category: 'web',
  slug: 'url-parser',
  kind: 'tool',
  keywords: [
    'url',
    'url parser',
    'url builder',
    'query string',
    'utm',
    'punycode',
  ],
  // URLs from the HTTP Client, Text Encoder and QR Scanner (spec 10).
  accepts: [{ mimes: ['text/uri-list'] }],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
