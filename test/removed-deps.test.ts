import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** Dependencies phase 6 replaced (spec 11.1); none may come back. */
const REMOVED = [
  'plotly.js',
  'react-plotly.js',
  '@types/plotly.js',
  '@types/react-plotly.js',
  '@xyflow/react',
  'dagre',
  '@types/dagre',
  '@uiw/react-textarea-code-editor',
  'rehype-prism-plus',
  'rehype-rewrite',
  'crypto-js',
  '@types/crypto-js',
  'lodash',
  '@types/lodash',
  // tools#104: toasts come from Cynosure.
  'sonner',
  // tools#104: floating surfaces are placed by Cynosure.
  '@floating-ui/react-dom',
  // tools#104: icons are Facet icons from Cynosure.
  'lucide-react',
  // The kit removal: no Tailwind, class helpers or Tailwind-era fonts.
  'tailwindcss',
  '@tailwindcss/vite',
  'class-variance-authority',
  'tailwind-merge',
  'clsx',
  '@fontsource-variable/inter',
  '@fontsource-variable/jetbrains-mono',
];

describe('removed dependencies (spec 11.1)', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as Record<
    string,
    Record<string, string> | undefined
  >;
  const declared = Object.keys({
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.optionalDependencies,
  });

  it.each(REMOVED)('%s is not declared', (name) => {
    expect(declared).not.toContain(name);
  });
});
