import { IconFileText } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'log-parser',
  name: 'Log Parser',
  description: 'Parse and analyze multiple types of development logs',
  icon: IconFileText,
  category: 'text',
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
