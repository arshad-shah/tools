import { IconClock } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pomodoro',
  name: 'Pomodoro',
  description: 'Focus and productivity timer',
  icon: IconClock,
  category: 'time',
  slug: 'pomodoro',
  kind: 'tool',
  keywords: ['timer', 'focus', 'productivity', 'break'],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
