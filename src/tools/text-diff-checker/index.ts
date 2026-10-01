import { Split } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'text-diff-checker',
  name: 'Text Diff Checker',
  description: 'Compare differences between text files or snippets',
  icon: Split,
  category: 'text',
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
