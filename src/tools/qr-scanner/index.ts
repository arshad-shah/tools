import { scanLine as icon } from '@arshad-shah/cynosure/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'qr-scanner',
  name: 'QR & Barcode Scanner',
  description:
    'Read QR codes and barcodes from images, the clipboard or the camera',
  icon,
  category: 'web',
  slug: 'qr-scan',
  kind: 'tool',
  keywords: [
    'qr scanner',
    'qr reader',
    'barcode scanner',
    'scan qr from image',
    'decode qr',
  ],
  accepts: [{ kinds: ['png', 'jpeg', 'webp', 'gif'], multiple: false }],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
