import { IconLink } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'url-encoder-decoder',
  name: 'Text Encoder / Decoder',
  description:
    'Encode and decode URL, HTML entities, Unicode escapes, Punycode, hex, Base32 and more',
  icon: IconLink,
  category: 'encoding',
  slug: 'text',
  kind: 'tool',
  keywords: [
    'url',
    'encode',
    'decode',
    'percent',
    'url encoder',
    'html entities',
    'unicode escape',
    'punycode',
    'quoted printable',
  ],
  // Text and URLs from other tools (URL Inspector, QR Scanner, Text Toolkit).
  accepts: [{ mimes: ['text/plain', 'text/uri-list'] }],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
