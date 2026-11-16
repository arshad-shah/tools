import { binary as icon } from '@arshad-shah/cynosure/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'number-converter',
  name: 'Number Base Converter',
  description:
    'Binary, octal, decimal, hex and any base 2 to 36, with word sizes, a bit grid and float readouts',
  icon,
  category: 'math',
  slug: 'number-base',
  kind: 'tool',
  keywords: [
    'binary',
    'hex',
    'octal',
    'decimal',
    'base converter',
    'twos complement',
  ],
  accepts: [{ mimes: ['text/plain'] }],
  version: '1.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
