import { IconFormInput } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-fill-form',
  name: 'Fill PDF Form',
  description:
    'Fill in text fields, checkboxes, radio buttons and lists in a PDF form',
  icon: IconFormInput,
  category: 'pdf',
  version: '1.0.0',
  isNew: true,
  enabled: true,
  load: () => import('./Tool'),
});
