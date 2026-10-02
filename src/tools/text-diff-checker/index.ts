import { IconSplit } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'text-diff-checker',
  name: 'Text Diff',
  description: 'Compare differences between text files or snippets',
  icon: IconSplit,
  category: 'text',
  slug: 'diff',
  kind: 'tool',
  keywords: [
    'compare',
    'difference',
    'changes',
    'text',
    'diff checker',
    'merge',
    'patch',
  ],
  accepts: [
    {
      kinds: ['text', 'csv', 'tsv', 'json', 'xml', 'log'],
      multiple: true,
      min: 2,
      max: 2,
    },
    { mimes: ['text/plain', 'application/vnd.tools.diff-pair+json'] },
  ],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
