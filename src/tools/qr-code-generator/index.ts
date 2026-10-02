import { IconQrCode } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'qr-code-generator',
  name: 'QR Code Generator',
  description: 'Generate QR codes',
  icon: IconQrCode,
  category: 'web',
  slug: 'qr',
  kind: 'tool',
  keywords: ['qr', 'code', 'barcode', 'generate'],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
