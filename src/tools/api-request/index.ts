import { IconLink } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'api-request',
  name: 'API Request',
  description: 'Make HTTP requests to APIs',
  icon: IconLink,
  category: 'web',
  slug: 'api-request',
  kind: 'tool',
  keywords: ['http', 'rest', 'request', 'fetch'],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
