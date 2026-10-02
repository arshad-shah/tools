import { IconTable } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'csv-viewer',
  name: 'CSV Viewer & Converter',
  description:
    'View, filter, profile, chart, edit and convert CSV and TSV data (XLSX, JSON, SQL and more)',
  icon: IconTable,
  category: 'data',
  slug: 'csv',
  kind: 'tool',
  keywords: [
    'csv',
    'tsv',
    'spreadsheet',
    'table',
    'xlsx',
    'convert',
    'csv to json',
    'csv to sql',
  ],
  accepts: [
    {
      kinds: ['csv', 'tsv'],
      mimes: ['text/csv', 'text/tab-separated-values', 'text/plain'],
    },
  ],
  version: '2.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
