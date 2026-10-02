import { IconShieldCheck } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'exif-tool',
  name: 'EXIF Viewer & Remover',
  description:
    'View photo metadata, check it for location and owner details, and remove it without re-encoding',
  icon: IconShieldCheck,
  category: 'media',
  alsoIn: ['security'],
  slug: 'exif',
  kind: 'tool',
  keywords: ['exif', 'metadata', 'gps', 'remove exif', 'photo metadata'],
  accepts: [{ kinds: ['jpeg', 'png', 'webp'], multiple: true }],
  version: '1.0.0',
  enabled: true,
  isNew: true,
  load: () => import('./Tool'),
});
