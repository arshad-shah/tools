import { brush as icon } from '@arshad-shah/cynosure/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'css-playground',
  slug: 'css',
  category: 'web',
  alsoIn: ['media'],
  kind: 'tool',
  name: 'CSS Playground & Optimizer',
  description:
    'Paste CSS to see it rendered live, then format, optimise, minify, lint and inspect specificity, colours and variables',
  icon,
  keywords: [
    'css',
    'stylesheet',
    'preview',
    'visualizer',
    'visualiser',
    'render',
    'optimizer',
    'optimiser',
    'minify',
    'lint',
    'specificity',
    'colors',
    'variables',
  ],
  accepts: [{ kinds: ['text'], mimes: ['text/css'] }],
  version: '1.0.0',
  enabled: true,
  isNew: true,
  load: () => import('./Tool'),
});
