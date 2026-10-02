import { IconCodeXml } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'json-and-xml-viewer',
  name: 'Json and Xml Viewer',
  description: 'View Json and Xml',
  icon: IconCodeXml,
  category: 'data',
  slug: 'json-xml',
  kind: 'tool',
  keywords: ['json', 'xml', 'tree', 'format'],
  accepts: [{ kinds: ['json', 'xml'] }],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
