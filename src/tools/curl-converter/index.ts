import { terminal as icon } from '@arshad-shah/cynosure/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'curl-converter',
  name: 'curl Converter',
  description:
    'Turn a curl command into fetch, axios, Python, Go, PHP or HTTPie code, or build one from a form',
  icon,
  category: 'web',
  slug: 'curl',
  kind: 'tool',
  keywords: [
    'curl',
    'curl converter',
    'curl to fetch',
    'curl to python',
    'axios',
    'requests',
    'httpie',
    'golang',
    'php',
  ],
  // A curl command from the HTTP Client, the palette or any text source.
  accepts: [{ mimes: ['application/x-curl'] }],
  version: '1.0.0',
  isNew: true,
  enabled: true,
  load: () => import('./Tool'),
});
