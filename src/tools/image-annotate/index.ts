import { annotateText as icon } from '@arshad-shah/cynosure/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'image-annotate',
  name: 'Image Editor',
  description:
    'Crop, rotate and annotate screenshots and photos with arrows, boxes, text, steps, highlights and real blur or pixelate redaction',
  icon,
  category: 'media',
  slug: 'annotate',
  kind: 'tool',
  keywords: [
    'annotate',
    'crop',
    'screenshot',
    'markup',
    'arrow',
    'blur',
    'pixelate',
    'redact',
    'rotate',
    'image editor',
  ],
  accepts: [{ kinds: ['png', 'jpeg', 'webp', 'gif'] }],
  version: '1.0.0',
  enabled: true,
  isNew: true,
  load: () => import('./Tool'),
});
