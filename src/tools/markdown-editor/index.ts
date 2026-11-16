import { fileText as icon } from '@arshad-shah/cynosure/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'markdown-editor',
  slug: 'markdown',
  category: 'text',
  kind: 'tool',
  name: 'Markdown Editor & Preview',
  description:
    'Write GitHub-flavoured Markdown with a live, sandboxed preview and export it',
  icon,
  keywords: ['markdown', 'md', 'preview', 'gfm', 'readme'],
  accepts: [{ kinds: ['text'], mimes: ['text/markdown', 'text/plain'] }],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
