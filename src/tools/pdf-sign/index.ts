import { IconSignature } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-sign',
  name: 'Sign PDF',
  description: 'Draw, upload or type a signature and place it on a page',
  icon: IconSignature,
  category: 'pdf',
  slug: 'sign',
  kind: 'tool',
  keywords: ['signature', 'draw', 'type', 'initials'],
  accepts: [{ kinds: ['pdf'] }],
  version: '1.0.0',
  isNew: true,
  enabled: true,
  load: () => import('./Tool'),
});
