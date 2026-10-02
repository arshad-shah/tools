import { IconFileCode } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'jwt-decode',
  name: 'JWT Decoder',
  description:
    'Decode, verify and build JSON Web Tokens, with live expiry and JWKS keys',
  icon: IconFileCode,
  category: 'encoding',
  slug: 'jwt',
  kind: 'tool',
  keywords: [
    'jwt',
    'token',
    'decode',
    'claims',
    'jwt debugger',
    'json web token',
  ],
  accepts: [{ mimes: ['application/jwt'] }],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
