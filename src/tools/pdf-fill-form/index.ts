import { FormInput } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-fill-form',
  name: 'Fill PDF Form',
  description:
    'Fill in text fields, checkboxes, radio buttons and lists in a PDF form',
  icon: FormInput,
  category: 'pdf',
  version: '1.0.0',
  isNew: true,
  enabled: true,
  load: () => import('./Tool'),
});
