import { FileCode } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'base64-converter',
  name: 'Base64 Converter',
  description: 'Convert text and files to and from Base64 encoding',
  icon: FileCode,
  category: 'encoding',
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
