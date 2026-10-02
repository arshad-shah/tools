import { IconTable } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'csv-viewer',
  name: 'CSV/TSV Viewer',
  description: 'View and manipulate CSV/TSV data with sorting and filtering',
  icon: IconTable,
  category: 'data',
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
