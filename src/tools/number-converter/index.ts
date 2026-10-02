import { IconCalculator } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'number-converter',
  name: 'Number Converter',
  description: 'Convert between number systems',
  icon: IconCalculator,
  category: 'math',
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
