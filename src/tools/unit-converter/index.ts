import { IconCalculator } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'unit-converter',
  name: 'Unit Converter',
  description: 'Convert between units',
  icon: IconCalculator,
  category: 'math',
  slug: 'units',
  kind: 'tool',
  keywords: ['convert', 'units', 'length', 'weight'],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
