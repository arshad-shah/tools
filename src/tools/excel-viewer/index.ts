import { fileGrid as icon } from '@arshad-shah/cynosure/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'excel-viewer',
  name: 'Excel Viewer',
  description:
    'Open .xlsx workbooks: every sheet, cell values, formulas and dates, exported as CSV or JSON',
  icon,
  category: 'data',
  slug: 'excel',
  kind: 'tool',
  keywords: [
    'excel',
    'xlsx',
    'xlsm',
    'spreadsheet',
    'workbook',
    'sheet',
    'xlsx to csv',
    'xlsx to json',
  ],
  version: '1.0.0',
  enabled: true,
  isNew: true,
  load: () => import('./Tool'),
});
