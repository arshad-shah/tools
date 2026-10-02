import { IconDice1 } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'random-data-generator',
  name: 'Random Data Generator',
  description: 'Generate test data like names, emails, and addresses',
  icon: IconDice1,
  category: 'data',
  slug: 'random',
  kind: 'tool',
  keywords: ['fake', 'mock', 'test', 'data'],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
