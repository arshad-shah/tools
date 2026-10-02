import { IconDice1 } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'random-data-generator',
  name: 'Mock Data Generator',
  description:
    'Generate realistic test data from a schema: seeded, related tables, locales, and exports to CSV, JSON, SQL, TypeScript and XML',
  icon: IconDice1,
  category: 'data',
  slug: 'random',
  kind: 'tool',
  keywords: [
    'random data',
    'fake data',
    'test data',
    'mock',
    'seed',
    'fixtures',
  ],
  accepts: [{ mimes: ['application/vnd.tools.mock-schema+json'] }],
  version: '2.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
