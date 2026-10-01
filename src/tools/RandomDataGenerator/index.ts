import { Dice1 } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'random-data-generator',
  name: 'Random Data Generator',
  description: 'Generate test data like names, emails, and addresses',
  icon: Dice1,
  category: 'data',
  version: '1.0.0',
  enabled: true,
  load: () => import('./RandomDataGenerator'),
});
