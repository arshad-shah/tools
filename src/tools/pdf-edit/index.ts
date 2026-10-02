import { IconModeEdit } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-edit',
  slug: 'edit',
  category: 'pdf',
  kind: 'workspace',
  name: 'PDF workspace',
  description:
    'Open a PDF and edit, organise, fill, sign, redact and convert it in one place',
  keywords: ['editor', 'workspace', 'organize', 'sign', 'annotate'],
  icon: IconModeEdit,
  accepts: [{ kinds: ['pdf'] }],
  enabled: true,
  load: () => import('./Tool'),
});
