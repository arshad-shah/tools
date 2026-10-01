import { QrCode } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'qr-code-generator',
  name: 'QR Code Generator',
  description: 'Generate QR codes',
  icon: QrCode,
  category: 'web',
  version: '1.0.0',
  enabled: true,
  load: () => import('./QRCodeGenerator'),
});
