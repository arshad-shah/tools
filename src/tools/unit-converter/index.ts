import { Calculator } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'unit-converter',
  name: 'Unit Converter',
  description: 'Convert between units',
  icon: Calculator,
  category: 'math',
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
