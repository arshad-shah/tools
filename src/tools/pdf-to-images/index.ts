import { FileImage } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-to-images',
  name: 'PDF to Images',
  description: 'Convert PDF pages to PNG or JPEG images at up to 300 DPI',
  icon: FileImage,
  category: 'pdf',
  version: '1.0.0',
  isNew: true,
  enabled: true,
  load: () => import('./Tool'),
});
