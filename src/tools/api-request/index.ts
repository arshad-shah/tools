import { IconLink } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'api-request',
  name: 'HTTP Client',
  description:
    'Send HTTP requests with params, auth, every body kind and environments',
  icon: IconLink,
  category: 'web',
  slug: 'http-client',
  kind: 'tool',
  keywords: [
    'http',
    'api request',
    'rest client',
    'postman',
    'curl',
    'graphql',
    'fetch',
  ],
  accepts: [
    {
      mimes: ['application/vnd.tools.http-request+json', 'application/x-curl'],
    },
  ],
  version: '2.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
