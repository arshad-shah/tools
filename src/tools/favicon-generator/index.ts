import { IconShapes } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'favicon-generator',
  name: 'Favicon & App Icon Generator',
  description:
    'Make favicon.ico, Apple touch and PWA icons, a web manifest and link tags from an image, SVG or text',
  icon: IconShapes,
  category: 'media',
  alsoIn: ['web'],
  slug: 'favicon',
  kind: 'tool',
  keywords: ['favicon', 'ico', 'apple touch icon', 'pwa icons', 'webmanifest'],
  accepts: [{ kinds: ['png', 'jpeg', 'webp', 'svg'], multiple: false }],
  version: '1.0.0',
  enabled: true,
  isNew: true,
  load: () => import('./Tool'),
});
