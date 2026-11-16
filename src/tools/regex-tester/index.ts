import { regex as icon } from '@arshad-shah/cynosure/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'regex-tester',
  name: 'Regex Tester',
  description: 'Test regular expressions',
  icon,
  category: 'text',
  slug: 'regex',
  kind: 'tool',
  keywords: ['regexp', 'pattern', 'match', 'expression'],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
