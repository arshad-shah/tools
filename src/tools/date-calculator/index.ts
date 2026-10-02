import { IconCalendar } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'date-calculator',
  name: 'Date Calculator',
  description: 'Calculate time between dates, add or subtract time periods',
  icon: IconCalendar,
  category: 'time',
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
