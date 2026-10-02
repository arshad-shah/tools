import { IconEye } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'regex-tester',
  name: 'Regex Tester',
  description: 'Test regular expressions',
  icon: IconEye,
  category: 'text',
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
