import { timer as icon } from '@arshad-shah/cynosure/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pomodoro',
  name: 'Pomodoro Timer',
  description: 'Focus and productivity timer',
  icon,
  category: 'time',
  slug: 'pomodoro',
  kind: 'tool',
  keywords: ['timer', 'focus', 'productivity', 'break'],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
