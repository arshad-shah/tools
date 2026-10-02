import { IconQrCode } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'qr-code-generator',
  name: 'QR Code Generator',
  description: 'Generate QR codes',
  icon: IconQrCode,
  category: 'web',
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
