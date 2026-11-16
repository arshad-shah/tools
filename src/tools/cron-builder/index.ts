import { history as icon } from '@arshad-shah/cynosure/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'cron-builder',
  name: 'Cron Expression Builder',
  description:
    'Build and explain cron schedules (Unix, with seconds or Quartz) and list the next run times in any zone',
  icon,
  category: 'time',
  alsoIn: ['web'],
  slug: 'cron',
  kind: 'tool',
  keywords: [
    'crontab',
    'cron generator',
    'quartz cron',
    'cron explain',
    'schedule',
  ],
  version: '1.0.0',
  enabled: true,
  isNew: true,
  load: () => import('./Tool'),
});
