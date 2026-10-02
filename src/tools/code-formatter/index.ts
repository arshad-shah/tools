import { IconCodeXml } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'code-formatter',
  name: 'Code Formatter & Minifier',
  description:
    'Format or minify JSON, JavaScript, TypeScript, CSS, HTML, Markdown, YAML, GraphQL, SQL and XML',
  icon: IconCodeXml,
  category: 'web',
  slug: 'format',
  alsoIn: ['data'],
  kind: 'tool',
  keywords: [
    'prettier',
    'beautify',
    'minify',
    'sql formatter',
    'html formatter',
    'css minifier',
    'code formatter',
  ],
  accepts: [
    {
      kinds: ['text'],
      mimes: [
        'text/plain',
        'application/json',
        'text/css',
        'text/html',
        'application/javascript',
        'application/sql',
      ],
    },
  ],
  version: '1.0.0',
  enabled: true,
  isNew: true,
  load: () => import('./Tool'),
});
