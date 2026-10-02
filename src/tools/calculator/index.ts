import { IconCalculator } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'calculator',
  name: 'Calculator & Grapher',
  description:
    'Expression sheet with variables, units and exact decimals, plus programmer mode and a function grapher',
  icon: IconCalculator,
  category: 'math',
  slug: 'calculator',
  kind: 'tool',
  keywords: [
    'math',
    'calculate',
    'arithmetic',
    'graph',
    'plot',
    'scientific',
    'programmer',
    'units',
    'bitwise',
  ],
  version: '2.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
