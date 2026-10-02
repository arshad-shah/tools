import { IconCodeXml } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'json-and-xml-viewer',
  name: 'Json and Xml Viewer',
  description: 'View Json and Xml',
  icon: IconCodeXml,
  category: 'data',
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
