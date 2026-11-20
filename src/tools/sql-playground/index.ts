import { database as icon } from '@arshad-shah/cynosure/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'sql-playground',
  name: 'SQL Playground',
  description:
    'Query CSV, TSV, JSON and SQLite files with SQL, in SQLite running in your browser',
  icon,
  category: 'data',
  slug: 'sql',
  kind: 'tool',
  keywords: [
    'sql',
    'sqlite',
    'query',
    'database',
    'csv to sql',
    'join csv',
    'db file',
  ],
  accepts: [
    // Rows sent from the CSV Viewer, the Excel Viewer and others.
    { mimes: ['text/csv'] },
    // Several data files dropped on a hub become tables (one file goes to
    // the CSV or JSON viewer, which are closer).
    { kinds: ['csv', 'tsv', 'json'], multiple: true, min: 2, max: 20 },
  ],
  version: '1.0.0',
  enabled: true,
  isNew: true,
  load: () => import('./Tool'),
});
