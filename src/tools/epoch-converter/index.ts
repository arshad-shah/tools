import { clock as icon } from '@arshad-shah/cynosure/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'epoch-converter',
  name: 'Epoch & Time Zone Converter',
  description:
    'Unix timestamps to dates and back, world clock, zone converter and meeting planner',
  icon,
  category: 'time',
  slug: 'epoch',
  kind: 'tool',
  keywords: [
    'unix timestamp',
    'epoch converter',
    'timestamp to date',
    'time zone converter',
    'world clock',
  ],
  accepts: [{ kinds: ['text'], mimes: ['text/plain'] }],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
