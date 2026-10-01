import { FileText } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'log-parser',
  name: 'Log Parser',
  description: 'Parse and analyze multiple types of development logs',
  icon: FileText,
  category: 'text',
  version: '1.0.0',
  enabled: true,
  load: () => import('./LogParser'),
});
