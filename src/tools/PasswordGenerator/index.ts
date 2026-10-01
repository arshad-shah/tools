import { Key } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'password-generator',
  name: 'Password Generator',
  description: 'Generate secure passwords',
  icon: Key,
  category: 'security',
  version: '1.0.0',
  enabled: true,
  load: () => import('./Generator'),
});
