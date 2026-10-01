import { Calculator } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'calculator',
  name: 'Calculator',
  description: 'A simple calculator',
  icon: Calculator,
  category: 'math',
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
