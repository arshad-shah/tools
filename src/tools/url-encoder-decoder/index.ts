import { Link } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'url-encoder-decoder',
  name: 'URL Encoder/Decoder',
  description: 'Encode and decode URL parameters',
  icon: Link,
  category: 'encoding',
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
