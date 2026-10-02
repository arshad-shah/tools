import { IconCalendar } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'date-calculator',
  name: 'Date & Time Calculator',
  description: 'Calculate time between dates, add or subtract time periods',
  icon: IconCalendar,
  category: 'time',
  slug: 'date',
  kind: 'tool',
  keywords: [
    'date',
    'days',
    'duration',
    'calendar',
    'business days',
    'date difference',
  ],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
