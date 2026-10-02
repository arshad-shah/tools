import { IconFileCode } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'jwt-decode',
  name: 'JWT Decoder',
  description: 'Decode JSON Web Tokens',
  icon: IconFileCode,
  category: 'encoding',
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
