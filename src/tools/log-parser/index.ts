import { scrollText as icon } from '@arshad-shah/cynosure/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'log-parser',
  name: 'Log Viewer',
  description: 'Open, filter and explore large log files',
  icon,
  category: 'text',
  slug: 'logs',
  kind: 'tool',
  keywords: [
    'log parser',
    'log',
    'parse',
    'errors',
    'analyze',
    'jsonl',
    'syslog',
    'access log',
  ],
  accepts: [
    { kinds: ['log', 'text'] },
    {
      mimes: ['text/plain', 'text/x-log', 'application/vnd.tools.regex+json'],
    },
  ],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
