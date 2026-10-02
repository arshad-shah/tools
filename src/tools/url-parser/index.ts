import { IconSplit } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'url-parser',
  name: 'URL Parser',
  description: 'Break down and analyze URL components',
  icon: IconSplit,
  category: 'web',
  slug: 'url-parser',
  kind: 'tool',
  keywords: ['url', 'parse', 'query', 'components'],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
