import { image as icon } from '@arshad-shah/cynosure/icons';
import { defineTool } from '@/app/tool';
import { CODE_MIMES } from './lib/mimes';

export default defineTool({
  id: 'code-to-image',
  name: 'Code to Image',
  description:
    'Turn code into a highlighted PNG or SVG image with themes, window frame, line numbers and highlights',
  icon,
  category: 'media',
  slug: 'code-image',
  alsoIn: ['web'],
  kind: 'tool',
  keywords: [
    'code screenshot',
    'code image',
    'carbon',
    'snippet image',
    'syntax highlight',
    'share code',
    'png',
    'svg',
  ],
  // Code from the Code Formatter, JSON to Types and other tools' Send to.
  accepts: [{ mimes: CODE_MIMES }],
  version: '1.0.0',
  enabled: true,
  isNew: true,
  load: () => import('./Tool'),
});
