import { IconQrCode } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'qr-code-generator',
  name: 'QR Code Generator',
  description:
    'QR codes for links, WiFi, contacts, events and payments, with style, export and a scan check',
  icon: IconQrCode,
  category: 'web',
  slug: 'qr',
  kind: 'tool',
  keywords: ['qr', 'code', 'generate', 'wifi qr', 'vcard qr', 'batch qr'],
  accepts: [
    {
      mimes: [
        'text/uri-list',
        'text/plain',
        'application/vnd.tools.colors+json',
      ],
    },
  ],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
