import { IconSplit } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'text-diff-checker',
  name: 'Text Diff Checker',
  description: 'Compare differences between text files or snippets',
  icon: IconSplit,
  category: 'text',
  slug: 'diff',
  kind: 'tool',
  keywords: ['compare', 'difference', 'changes', 'text'],
  accepts: [
    {
      kinds: ['text', 'csv', 'tsv', 'json', 'xml', 'log'],
      multiple: true,
      min: 2,
      max: 2,
    },
  ],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
