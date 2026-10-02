import { IconTags } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'uuid-generator',
  name: 'UUID / ULID / NanoID Generator',
  description:
    'Generate UUID v4, v7 and v5, ULIDs and NanoIDs in bulk, and decode an ID',
  icon: IconTags,
  category: 'security',
  alsoIn: ['data'],
  slug: 'uuid',
  kind: 'tool',
  keywords: [
    'guid',
    'uuid v4',
    'uuid v7',
    'ulid',
    'nanoid',
    'uuid',
    'unique id',
  ],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
