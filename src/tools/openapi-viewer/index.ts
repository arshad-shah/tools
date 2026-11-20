import { api as icon } from '@arshad-shah/cynosure/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'openapi-viewer',
  name: 'OpenAPI Viewer',
  description:
    'Browse an OpenAPI 3 or Swagger 2 document: endpoints by tag, schemas and examples, and send any request to the HTTP Client',
  icon,
  category: 'web',
  slug: 'openapi',
  kind: 'tool',
  keywords: [
    'openapi',
    'swagger',
    'api docs',
    'rest api',
    'endpoints',
    'schema',
    'yaml',
  ],
  accepts: [
    {
      kinds: ['json'],
      mimes: [
        'application/json',
        'application/yaml',
        'application/x-yaml',
        'text/yaml',
        'application/vnd.oai.openapi',
        'application/vnd.oai.openapi+json',
      ],
    },
  ],
  version: '1.0.0',
  isNew: true,
  enabled: true,
  load: () => import('./Tool'),
});
