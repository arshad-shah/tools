import { pageMerge as icon } from '@arshad-shah/cynosure/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-merger',
  name: 'PDF Merger',
  description: 'Merge multiple PDF files into a single document',
  icon,
  category: 'pdf',
  slug: 'merge',
  kind: 'quick-task',
  keywords: ['combine', 'join', 'append', 'pdf'],
  accepts: [{ kinds: ['pdf'], multiple: true, min: 2 }],
  version: '2.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
