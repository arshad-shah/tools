import { IconPalette } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'color-tester',
  name: 'Color & Contrast',
  description:
    'Convert colours between every CSS format, check WCAG and APCA contrast, build OKLCH palettes and extract colours from images',
  icon: IconPalette,
  category: 'media',
  slug: 'color',
  kind: 'tool',
  keywords: [
    'colour',
    'color',
    'contrast',
    'wcag',
    'apca',
    'palette',
    'oklch',
    'eyedropper',
  ],
  accepts: [{ kinds: ['png', 'jpeg', 'webp'], multiple: false }],
  version: '2.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
