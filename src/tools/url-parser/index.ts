import { Split } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'url-parser',
  name: 'URL Parser',
  description: 'Break down and analyze URL components',
  icon: Split,
  category: 'web',
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
