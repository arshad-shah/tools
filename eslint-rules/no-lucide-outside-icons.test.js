import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, it } from 'vitest';
import rule from './no-lucide-outside-icons.js';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const bad = [{ messageId: 'lucide' }];

tester.run('no-lucide-outside-icons', rule, {
  valid: [
    { code: `import { IconStar } from '@/shared/ui/icons';` },
    { code: `import x from 'lucide';` },
    { code: `import x from 'lucide-reactor';` },
    {
      code: `import { Star } from 'lucide-react';`,
      filename: 'src/shared/ui/icons/lucide.ts',
    },
    {
      code: `import { Star } from 'lucide-react';`,
      filename: 'C:\\repo\\src\\shared\\ui\\icons\\lucide.ts',
    },
  ],
  invalid: [
    {
      code: `import { Star } from 'lucide-react';`,
      filename: 'src/tools/x/Tool.tsx',
      errors: bad,
    },
    {
      code: `import type { LucideIcon } from 'lucide-react';`,
      filename: 'src/app/tool.ts',
      errors: bad,
    },
    {
      code: `import Icon from 'lucide-react/dist/esm/icons/x';`,
      filename: 'src/app/App.tsx',
      errors: bad,
    },
    {
      code: `import { Star } from 'lucide-react';`,
      filename: 'src/shared/ui/iconsish/x.ts',
      errors: bad,
    },
    {
      code: `export { Star } from 'lucide-react';`,
      filename: 'src/app/a.ts',
      errors: bad,
    },
    {
      code: `export * from 'lucide-react';`,
      filename: 'src/app/a.ts',
      errors: bad,
    },
    {
      code: `const m = import('lucide-react');`,
      filename: 'src/app/a.ts',
      errors: bad,
    },
    {
      code: 'const m = import(`lucide-react/dist/esm/icons/x`);',
      filename: 'src/app/a.ts',
      errors: bad,
    },
    {
      code: `const m = require('lucide-react');`,
      filename: 'src/app/a.ts',
      errors: bad,
    },
    {
      code: `type T = typeof import('lucide-react');`,
      filename: 'src/app/a.ts',
      errors: bad,
    },
  ],
});
