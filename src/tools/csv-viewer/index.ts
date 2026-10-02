import { IconTable } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'csv-viewer',
  name: 'CSV/TSV Viewer',
  description: 'View and manipulate CSV/TSV data with sorting and filtering',
  icon: IconTable,
  category: 'data',
  slug: 'csv',
  kind: 'tool',
  keywords: ['csv', 'tsv', 'spreadsheet', 'table'],
  accepts: [{ kinds: ['csv', 'tsv'] }],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
