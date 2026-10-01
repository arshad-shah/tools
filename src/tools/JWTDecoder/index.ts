import { FileCode } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'jwt-decode',
  name: 'JWT Decoder',
  description: 'Decode JSON Web Tokens',
  icon: FileCode,
  category: 'encoding',
  version: '1.0.0',
  enabled: true,
  load: () => import('./JwtDecoder'),
});
