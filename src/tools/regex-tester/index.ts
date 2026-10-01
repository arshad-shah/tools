import { Eye } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'regex-tester',
  name: 'Regex Tester',
  description: 'Test regular expressions',
  icon: Eye,
  category: 'text',
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
