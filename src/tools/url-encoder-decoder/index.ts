import { IconLink } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'url-encoder-decoder',
  name: 'URL Encoder/Decoder',
  description: 'Encode and decode URL parameters',
  icon: IconLink,
  category: 'encoding',
  slug: 'url',
  kind: 'tool',
  keywords: ['url', 'encode', 'decode', 'percent'],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
