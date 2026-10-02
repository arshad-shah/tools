import { IconCodeXml } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'json-and-xml-viewer',
  name: 'JSON & XML Viewer',
  description:
    'Explore JSON, XML and YAML as a tree or a map, query with JSONPath or XPath, and convert between formats',
  icon: IconCodeXml,
  category: 'data',
  slug: 'json-xml',
  kind: 'tool',
  keywords: [
    'json',
    'xml',
    'yaml',
    'jsonpath',
    'xpath',
    'tree',
    'viewer',
    'json and xml viewer',
  ],
  accepts: [
    {
      kinds: ['json', 'xml', 'text'],
      mimes: [
        'application/json',
        'application/xml',
        'text/xml',
        'application/yaml',
      ],
    },
  ],
  version: '2.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
