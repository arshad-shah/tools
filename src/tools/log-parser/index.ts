import { IconFileText } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'log-parser',
  name: 'Log Parser',
  description: 'Parse and analyze multiple types of development logs',
  icon: IconFileText,
  category: 'text',
  slug: 'logs',
  kind: 'tool',
  keywords: ['log', 'parse', 'errors', 'analyze'],
  accepts: [{ kinds: ['log', 'text'] }],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
