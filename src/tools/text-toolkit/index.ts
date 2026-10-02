import { IconType } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'text-toolkit',
  slug: 'toolkit',
  category: 'text',
  kind: 'tool',
  name: 'Text Toolkit',
  description:
    'Count words, change case, sort and dedupe lines, clean up and find and replace text',
  icon: IconType,
  keywords: [
    'word count',
    'case converter',
    'slugify',
    'sort lines',
    'dedupe',
    'find and replace',
  ],
  accepts: [{ kinds: ['text'], mimes: ['text/plain'] }],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
