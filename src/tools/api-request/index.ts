import { IconLink } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'api-request',
  name: 'API Request',
  description: 'Make HTTP requests to APIs',
  icon: IconLink,
  category: 'web',
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
