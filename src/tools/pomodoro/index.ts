import { Clock } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pomodoro',
  name: 'Pomodoro',
  description: 'Focus and productivity timer',
  icon: Clock,
  category: 'time',
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
