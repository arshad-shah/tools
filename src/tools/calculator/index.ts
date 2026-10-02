import { IconCalculator } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'calculator',
  name: 'Calculator',
  description: 'A simple calculator',
  icon: IconCalculator,
  category: 'math',
  slug: 'calculator',
  kind: 'tool',
  keywords: ['math', 'calculate', 'arithmetic', 'graph'],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
